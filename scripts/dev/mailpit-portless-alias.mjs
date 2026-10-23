/**
 * Register or remove the Portless HTTPS alias for local Mailpit UI.
 * SMTP stays on loopback `127.0.0.1:26640` (not Portless).
 *
 * Usage:
 *   node scripts/dev/mailpit-portless-alias.mjs
 *   node scripts/dev/mailpit-portless-alias.mjs --remove
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_PORTS } from "@bondery/schemas/constants/dev-ports";

const remove = process.argv.includes("--remove");
const websiteDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/website");
const env = { ...process.env, PORTLESS_TLD: "test" };

const portlessArgs = remove
  ? ["exec", "portless", "alias", "--remove", "mail.usebondery"]
  : ["exec", "portless", "alias", "mail.usebondery", String(DEV_PORTS.MAILPIT_UI), "--force"];

const result = spawnSync("pnpm", portlessArgs, {
  cwd: websiteDir,
  env,
  shell: true,
  stdio: "inherit",
});

if (remove) {
  // Best-effort: missing alias must not block compose down.
  process.exit(0);
}

process.exit(result.status === null ? 1 : result.status);
