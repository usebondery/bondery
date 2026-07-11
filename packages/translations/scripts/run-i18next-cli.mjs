import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const configPath = "packages/translations/i18next.config.ts";
const args = process.argv.slice(2);

const i18nextCliPath = path.join(repoRoot, "node_modules/i18next-cli/dist/esm/cli.js");

const result = spawnSync(process.execPath, [i18nextCliPath, ...args, "-c", configPath], {
  cwd: repoRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
