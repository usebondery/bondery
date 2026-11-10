/**
 * Register the static Portless HTTPS aliases for the fixed local dev ports.
 *
 * Alias routes are stored with pid 0. They survive process exit, so the hosts
 * file stays complete whether or not a dev server is running. The Portless dev
 * wrapper (`portless`) is not used here: it registers a pid-bound route that
 * replaces an alias, then deletes that route when the process exits.
 *
 * Hostnames and ports come from `DEV_PORTS` / `DEV_URLS` only. This script is
 * the single writer of dev routes.
 *
 * Usage:
 *   node scripts/dev/portless-alias.mjs              # every alias
 *   node scripts/dev/portless-alias.mjs webapp       # one alias
 *   node scripts/dev/portless-alias.mjs --remove api # remove one alias
 *
 * `pnpm exec portless` runs from the repo root, where `portless` is installed.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DEV_PORTS, DEV_URLS } from "@bondery/schemas/constants/dev-ports";

/** The hosts file and the proxy both need this TLD. */
const TLD = "test";

const websiteDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/website");

/** `portless` is a devDependency of the workspace root; call its CLI entry. */
const PORTLESS_CLI = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../node_modules/portless/dist/cli.js",
);

/**
 * Portless appends the TLD to the alias name, so the name is the URL host
 * without its `.test` suffix.
 *
 * @param {string} url
 * @returns {string}
 */
function aliasName(url) {
  return new URL(url).hostname.replace(new RegExp(`\\.${TLD}$`), "");
}

const TARGETS = {
  api: { name: aliasName(DEV_URLS.api), port: DEV_PORTS.API },
  mailpit: { name: aliasName(DEV_URLS.mailpitUi), port: DEV_PORTS.MAILPIT_UI },
  webapp: { name: aliasName(DEV_URLS.webapp), port: DEV_PORTS.WEBAPP },
  website: { name: aliasName(DEV_URLS.website), port: DEV_PORTS.WEBSITE },
};

function runPortless(args) {
  // Call the CLI entry directly. Spawning the pnpm shim needs `shell: true` on
  // Windows, which concatenates arguments without escaping.
  const result = spawnSync(process.execPath, [PORTLESS_CLI, ...args], {
    cwd: websiteDir,
    env: { ...process.env, PORTLESS_TLD: TLD },
    stdio: "inherit",
  });
  return result.status === null ? 1 : result.status;
}

const remove = process.argv.includes("--remove");
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const names = requested.length > 0 ? requested : Object.keys(TARGETS);

const unknown = names.filter((name) => !(name in TARGETS));
if (unknown.length > 0) {
  console.error(
    `Unknown alias: ${unknown.join(", ")}. Use one of: ${Object.keys(TARGETS).join(", ")}.`,
  );
  process.exit(1);
}

if (!remove) {
  // `proxy start` is idempotent. Without a running proxy the `.test` hostnames
  // do not resolve and every alias registration warns.
  const proxyStatus = runPortless(["proxy", "start", "--tld", TLD]);
  if (proxyStatus !== 0) {
    process.exit(proxyStatus);
  }
}

for (const name of names) {
  const target = TARGETS[name];
  const args = remove
    ? ["alias", "--remove", target.name]
    : ["alias", target.name, String(target.port), "--force"];
  const status = runPortless(args);
  if (status !== 0 && !remove) {
    process.exit(status);
  }
}

if (!remove) {
  // The alias handler asks the proxy to sync hosts, which races when several
  // aliases are registered in a row. Sync once at the end. A non-zero exit here
  // means the hosts file needs Administrator; the aliases are still registered.
  runPortless(["hosts", "sync"]);
}
