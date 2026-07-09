/**
 * @deprecated Use root `npm run check-translations` and `npm run i18n:status:check` instead.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

console.warn(
  "check-missing-translations.mjs is deprecated. Running check-translations + i18n:status:check…",
);

const checks = [
  ["check-translations", ["run", "check-translations"]],
  ["i18n:status:check", ["run", "i18n:status:check"]],
];

for (const [label, args] of checks) {
  const result = spawnSync("npm", args, { cwd: repoRoot, shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`${label} passed.`);
}
