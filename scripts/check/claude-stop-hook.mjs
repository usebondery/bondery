/**
 * Claude Code Stop hook: do not let an agent finish while `check:changed` fails.
 *
 * Exit 2 with the failure summary on stderr makes Claude Code keep working and see the output.
 * `stop_hook_active` is true when Claude is already continuing because of this hook, so a
 * failure that cannot be fixed never loops forever.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function main() {
  const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    input = {};
  }
  if (input.stop_hook_active) {
    return;
  }

  const result = spawnSync(process.execPath, ["scripts/check/check-changed.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  // 3 means every check that ran passed but some were skipped (a dev session holds `dist`). The
  // hook must not force an agent to kill a developer's running servers, so it lets that through.
  if (result.status === 0 || result.status === 3) {
    return;
  }
  process.stderr.write(
    `${result.stdout}\nFix these before finishing. Re-run \`pnpm run check:changed\` to confirm.\n`,
  );
  process.exitCode = 2;
}

main();
