import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const configPath = "packages/translations/i18next.config.ts";
const args = process.argv.slice(2);

// Resolve from this package (isolated linker); do not assume root hoist.
const requireFromPackage = createRequire(path.join(packageRoot, "package.json"));
const i18nextPkgJson = requireFromPackage.resolve("i18next-cli/package.json");
const i18nextCliPath = path.join(path.dirname(i18nextPkgJson), "dist/esm/cli.js");

const result = spawnSync(process.execPath, [i18nextCliPath, ...args, "-c", configPath], {
  cwd: repoRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
