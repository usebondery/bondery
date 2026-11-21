/**
 * Tool-neutral setup for a fresh git worktree or clone. Orca (`orca.yaml`), Cursor
 * (`.cursor/worktrees.json`), Claude Code (SessionStart hook in `.claude/settings.json`), VS Code
 * (folder-open task) and a plain terminal (`pnpm run setup:worktree`) all call this one script.
 *
 * Flags:
 *   --if-needed  skip setup when dependencies and env files exist (fast, for hooks); still seed a
 *                missing CodeGraph index
 *
 * Env files are gitignored, so a fresh worktree starts without any. This script:
 *   1. installs dependencies
 *   2. seeds root `.env.local` from the primary checkout (keeps locally invented secrets)
 *   3. pulls the shared secrets from Infisical over it (`pnpm run env:pull`)
 *   4. generates the per-app env files (`pnpm run env`)
 *   5. seeds the CodeGraph index from the primary checkout, when that checkout has one
 *   6. builds the workspace packages so typecheck and the pre-commit hook work
 *
 * Steps 3 to 6 warn instead of failing, so a missing `infisical login` or CodeGraph CLI never
 * blocks the worktree.
 * Run it by hand with `pnpm run setup:worktree`.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

async function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const shell = process.platform === "win32";

  const warnings = [];
  const ifNeeded = process.argv.includes("--if-needed");

  /** Primary checkout: Orca and Conductor set a root path, Cursor sets ROOT_WORKTREE_PATH. */
  function findPrimaryRoot() {
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: set by worktree tools, not a turbo task input
    const fromEnv = process.env.ORCA_ROOT_PATH ?? process.env.ROOT_WORKTREE_PATH;
    if (fromEnv) {
      return resolve(fromEnv);
    }
    // Any tool: the primary checkout owns the shared .git directory.
    const result = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    const commonDir = result.status === 0 ? result.stdout.trim() : "";
    return commonDir.endsWith(".git") ? resolve(dirname(commonDir)) : null;
  }

  const primaryRoot = findPrimaryRoot();

  const primaryIndex = primaryRoot ? join(primaryRoot, ".codegraph", "codegraph.db") : null;
  const worktreeIndex = join(repoRoot, ".codegraph", "codegraph.db");

  /**
   * Give this worktree the CodeGraph index of the primary checkout.
   *
   * The database is gitignored, so a new worktree has `.codegraph/` without it and CodeGraph reports
   * "not indexed". Copying and syncing takes about a minute; a fresh index takes far longer. Only an
   * index the developer already chose to build is copied. The copy uses SQLite's backup API, not a
   * file copy, because the primary database is live (WAL mode) and a raw copy can be inconsistent.
   */
  async function seedCodeGraph() {
    if (existsSync(worktreeIndex)) {
      console.log("CodeGraph index already present");
      return;
    }
    if (!primaryIndex || primaryRoot === repoRoot || !existsSync(primaryIndex)) {
      console.log("Primary checkout has no CodeGraph index; skipping");
      return;
    }
    mkdirSync(dirname(worktreeIndex), { recursive: true });
    const source = new DatabaseSync(primaryIndex, { readOnly: true });
    try {
      await backup(source, worktreeIndex);
    } finally {
      source.close();
    }
    console.log(`Copied the CodeGraph index from ${primaryRoot}`);
    run("codegraph", ["sync", "."], { optional: true });
  }

  const needsCodeGraph = Boolean(
    primaryIndex &&
      primaryRoot !== repoRoot &&
      existsSync(primaryIndex) &&
      !existsSync(worktreeIndex),
  );

  if (
    ifNeeded &&
    existsSync(join(repoRoot, "node_modules")) &&
    existsSync(join(repoRoot, ".env.local")) &&
    existsSync(join(repoRoot, "apps/api/.env.development.local"))
  ) {
    // Dependencies and env files exist. A worktree set up before CodeGraph seeding still needs it.
    if (needsCodeGraph) {
      step("Seed CodeGraph index");
      await seedCodeGraph();
    }
    return;
  }

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
      process.exitCode = result.status ?? 1;
      return;
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

  /**
   * Keys the developer sets for local dev that Infisical holds production values for. env:pull would
   * overwrite them (the real SMTP host breaks the API's Mailpit-only dev check and could send real
   * email), so they are read before the pull and written back after it.
   */
  const LOCAL_ONLY_KEYS = ["BONDERY_PRIVATE_EMAIL_HOST", "BONDERY_PRIVATE_EMAIL_PORT"];

  function readLocalOnlyValues() {
    if (!existsSync(targetEnv)) {
      return {};
    }
    const text = readFileSync(targetEnv, "utf-8");
    const values = {};
    for (const key of LOCAL_ONLY_KEYS) {
      const match = text.match(new RegExp(`^${key}=(.*)$`, "m"));
      if (match) {
        values[key] = match[1];
      }
    }
    return values;
  }

  function restoreLocalOnlyValues(values) {
    if (!existsSync(targetEnv) || Object.keys(values).length === 0) {
      return;
    }
    let text = readFileSync(targetEnv, "utf-8");
    for (const [key, value] of Object.entries(values)) {
      text = text.replace(new RegExp(`^${key}=.*$`, "m"), () => `${key}=${value}`);
    }
    writeFileSync(targetEnv, text);
    console.log(`Kept local values for ${Object.keys(values).join(", ")}`);
  }

  step("Pull shared secrets from Infisical");
  const localOnlyValues = readLocalOnlyValues();
  if (!run("pnpm", ["run", "env:pull"], { optional: true }) && !existsSync(targetEnv)) {
    warnings.push("No .env.local. Run `infisical login`, then `pnpm run env:pull`.");
  }

  restoreLocalOnlyValues(localOnlyValues);

  step("Generate per-app env files");
  run("pnpm", ["run", "env"], { optional: true });

  step("Seed CodeGraph index");
  await seedCodeGraph();

  step("Build workspace packages");
  run("pnpm", ["turbo", "run", "build", "--filter=./packages/*"], {
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://placeholder:placeholder@localhost:5432/placeholder",
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
}

void main();
