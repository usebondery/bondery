/**
 * Resolve Playwright public URLs from the same env the API uses.
 *
 * Load `apps/api/.env.development.local` then `packages/db/.env.local`.
 * Variables already in the process keep their values.
 * Cookie domain and baseURL come from BONDERY_PUBLIC_* hosts.
 * E2E_PUBLIC_HOST is an optional check. It must match those hosts when set.
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const API_PUBLIC_URL = "BONDERY_PUBLIC_API_URL";
const WEBAPP_PUBLIC_URL = "BONDERY_PUBLIC_WEBAPP_URL";

export function loadE2eAuthEnv() {
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
  } catch {
    throw new Error(`${name} is not a valid URL: ${value}`);
  }

  if (!url.hostname) {
    throw new Error(`${name} has no hostname: ${value}`);
  }

  return url;
}

export function resolveE2ePublicUrls() {
  loadE2eAuthEnv();

  const apiUrl = requirePublicUrl(API_PUBLIC_URL);
  const webappUrl = requirePublicUrl(WEBAPP_PUBLIC_URL);

  if (apiUrl.hostname !== webappUrl.hostname) {
    throw new Error(
      `${API_PUBLIC_URL} host (${apiUrl.hostname}) disagrees with ` +
        `${WEBAPP_PUBLIC_URL} host (${webappUrl.hostname}). ` +
        "Cookies and OAuth redirects will miss.",
    );
  }

  const hostOverride = process.env.E2E_PUBLIC_HOST;
  if (hostOverride && hostOverride !== apiUrl.hostname) {
    throw new Error(
      `E2E_PUBLIC_HOST=${hostOverride} disagrees with BONDERY_PUBLIC_* host ${apiUrl.hostname}. ` +
        "Unset E2E_PUBLIC_HOST or align the env URLs.",
    );
  }

  return {
    apiUrl: apiUrl.origin,
    cookieDomain: apiUrl.hostname,
    webappUrl: webappUrl.origin,
  };
}
