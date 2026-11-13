/**
 * Compatibility wrapper. Old invocations keep this path.
 * Safety rules for both plugin trees live in scripts/check/check-llm-plugins.mjs.
 *
 * Usage: node scripts/check/check-claude-plugin.mjs
 *        (pnpm run check:claude-plugin)
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const result = spawnSync(process.execPath, ["scripts/check/check-llm-plugins.mjs"], {
  cwd: root,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
