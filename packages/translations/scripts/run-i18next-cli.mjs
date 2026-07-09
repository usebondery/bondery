import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const configPath = "packages/translations/i18next.config.ts";
const args = process.argv.slice(2);

const result = spawnSync("npx", ["i18next-cli", ...args, "-c", configPath], {
  cwd: repoRoot,
  shell: true,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
