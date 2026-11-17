/**
 * Setup script Orca runs in every new worktree (see `orca.yaml`).
 *
 * Env files are gitignored, so a fresh worktree starts without any. This script:
 *   1. installs dependencies
 *   2. seeds root `.env.local` from the primary checkout (keeps locally invented secrets)
 *   3. pulls the shared secrets from Infisical over it (`pnpm run env:pull`)
 *   4. generates the per-app env files (`pnpm run env`)
 *   5. builds the workspace packages so typecheck and the pre-commit hook work
 *
 * Steps 3 to 5 warn instead of failing, so a missing `infisical login` never blocks the worktree.
 * Run it by hand with `pnpm run setup:worktree`.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
// biome-ignore lint/suspicious/noUndeclaredEnvVars: set by Orca, not a turbo task input
const primaryRoot = process.env.ORCA_ROOT_PATH ? resolve(process.env.ORCA_ROOT_PATH) : null;
const shell = process.platform === "win32";

const warnings = [];

function step(title) {
  console.log(`\n[worktree-setup] ${title}`);
}

function run(command, args, { optional = false, env = {} } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    shell,
    stdio: "inherit",
  });
  if (result.status === 0) {
    return true;
  }
  const line = `${command} ${args.join(" ")} exited with ${result.status ?? "a signal"}`;
  if (!optional) {
    console.error(`[worktree-setup] ${line}`);
    process.exit(result.status ?? 1);
  }
  warnings.push(line);
  return false;
}

step("Install dependencies");
run("pnpm", ["install"]);

step("Seed .env.local");
const targetEnv = join(repoRoot, ".env.local");
const sourceEnv = primaryRoot ? join(primaryRoot, ".env.local") : null;
if (existsSync(targetEnv)) {
  console.log(".env.local already exists, keeping it");
} else if (sourceEnv && primaryRoot !== repoRoot && existsSync(sourceEnv)) {
  copyFileSync(sourceEnv, targetEnv);
  console.log(`Copied .env.local from ${primaryRoot}`);
} else {
  console.log("No primary .env.local to copy; env:pull will create one from the example");
}

step("Pull shared secrets from Infisical");
if (!run("pnpm", ["run", "env:pull"], { optional: true }) && !existsSync(targetEnv)) {
  warnings.push("No .env.local. Run `infisical login`, then `pnpm run env:pull`.");
}

step("Generate per-app env files");
run("pnpm", ["run", "env"], { optional: true });

step("Build workspace packages");
run("pnpm", ["turbo", "run", "build", "--filter=./packages/*"], {
  env: {
    DATABASE_URL:
      process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  optional: true,
});

if (warnings.length > 0) {
  console.warn("\n[worktree-setup] Finished with warnings:");
  for (const warning of warnings) {
    console.warn(`  - ${warning}`);
  }
  console.warn("Fix them and re-run `pnpm run setup:worktree`.");
} else {
  console.log("\n[worktree-setup] Done");
}
