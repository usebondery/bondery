/**
 * Register the Portless HTTPS alias for the local API.
 * The API dev server listens on loopback. The webapp calls https://api.usebondery.test.
 *
 * Usage:
 *   node scripts/dev/api-portless-alias.mjs
 *   node scripts/dev/api-portless-alias.mjs --remove
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_PORTS } from "@bondery/schemas/constants/dev-ports";

const remove = process.argv.includes("--remove");
const websiteDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/website");
const env = { ...process.env, PORTLESS_TLD: "test" };

const portlessArgs = remove
  ? ["exec", "portless", "alias", "--remove", "api.usebondery"]
  : ["exec", "portless", "alias", "api.usebondery", String(DEV_PORTS.API), "--force"];

const result = spawnSync("pnpm", portlessArgs, {
  cwd: websiteDir,
  env,
  shell: true,
  stdio: "inherit",
});

if (remove) {
  process.exit(0);
}

process.exit(result.status === null ? 1 : result.status);
