/**
 * Resolve Playwright public URLs from the same env the API uses.
 *
 * Load `apps/api/.env.development.local` then `packages/db/.env.local`.
 * Variables already in the process keep their values.
 * Cookie domain and baseURL come from BONDERY_PUBLIC_* hosts.
 * E2E_PUBLIC_HOST is an optional check. It must match the API host or the shared site when set.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import tls from "node:tls";
import { fileURLToPath } from "node:url";

const PATTERN = /^[\d.]+$/u;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const API_PUBLIC_URL = "BONDERY_PUBLIC_API_URL";
const WEBAPP_PUBLIC_URL = "BONDERY_PUBLIC_WEBAPP_URL";

function requirePublicUrl(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is missing after loading API env. Set it in apps/api/.env.development.local ` +
        "or in the process environment.",
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch (error) {
    throw new Error(`${name} is not a valid URL: ${value}`, { cause: error });
  }

  if (!url.hostname) {
    throw new Error(`${name} has no hostname: ${value}`);
  }

  return url;
}

/**
 * Let Node's `fetch` trust the Portless dev certificate authority.
 *
 * The dev stack serves `*.usebondery.test` over HTTPS with a local CA. Browsers trust it through
 * the system store, but Node does not, so the stack probes in `globalSetup` failed with
 * SELF_SIGNED_CERT_IN_CHAIN. Adding the CA at runtime works in the runner and in every worker,
 * because each loads this module, and needs no env var set before Node starts.
 */
export function trustPortlessCa() {
  const caPath = resolve(homedir(), ".portless", "ca.pem");
  if (!existsSync(caPath) || typeof tls.setDefaultCACertificates !== "function") {
    return;
  }
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), readFileSync(caPath, "utf8")]);
}

export function loadE2eAuthEnv() {
  trustPortlessCa();

  const envFiles = [
    resolve(repoRoot, "apps/api/.env.development.local"),
    resolve(repoRoot, "packages/db/.env.local"),
  ];

  for (const envFile of envFiles) {
    if (!existsSync(envFile)) {
      continue;
    }

    process.loadEnvFile(envFile);
  }
}

/**
 * The shared parent domain of two hosts, or null when they are different sites.
 *
 * Dev serves the API and the webapp on sibling hosts (`api.usebondery.test`,
 * `app.usebondery.test`). Cookies set for the parent domain reach both, so they count as the
 * same site. IP addresses and single-label hosts such as `localhost` must match exactly.
 *
 * @param {string} a hostname
 * @param {string} b hostname
 * @returns {string | null}
 */
export function sharedSite(a, b) {
  if (a === b) {
    return a;
  }
  const isNamed = (host) => host.includes(".") && !PATTERN.test(host) && !host.includes(":");
  if (!isNamed(a) || !isNamed(b)) {
    return null;
  }
  const parent = (host) => host.split(".").slice(-2).join(".");
  return parent(a) === parent(b) ? parent(a) : null;
}

export function resolveE2ePublicUrls() {
  loadE2eAuthEnv();

  const apiUrl = requirePublicUrl(API_PUBLIC_URL);
  const webappUrl = requirePublicUrl(WEBAPP_PUBLIC_URL);

  const site = sharedSite(apiUrl.hostname, webappUrl.hostname);
  if (site === null) {
    throw new Error(
      `${API_PUBLIC_URL} host (${apiUrl.hostname}) is a different site from ` +
        `${WEBAPP_PUBLIC_URL} host (${webappUrl.hostname}). ` +
        "Cookies and OAuth redirects will miss.",
    );
  }

  const hostOverride = process.env.E2E_PUBLIC_HOST;
  if (hostOverride && hostOverride !== site && hostOverride !== apiUrl.hostname) {
    throw new Error(
      `E2E_PUBLIC_HOST=${hostOverride} disagrees with BONDERY_PUBLIC_* site ${site}. ` +
        "Unset E2E_PUBLIC_HOST or align the env URLs.",
    );
  }

  return {
    apiUrl: apiUrl.origin,
    cookieDomain: site,
    webappUrl: webappUrl.origin,
  };
}
