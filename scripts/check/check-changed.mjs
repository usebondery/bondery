/**
 * One fast command that checks only what your change touches.
 *
 * The loop for agents and people: write, run `pnpm run check:changed`, fix, report. A change is
 * done when this passes, not when it looks right.
 *
 * It compares the working tree (committed, staged, unstaged and new files) with the merge base
 * of `origin/main`, maps changed paths to the checks that can break, and runs them in parallel.
 * CI still runs the full `pnpm run check`.
 *
 * Usage:
 *   pnpm run check:changed                 # run
 *   pnpm run check:changed -- --list       # show what would run, run nothing
 *   pnpm run check:changed -- --base main  # compare against another ref
 *   pnpm run check:changed -- --only biome,types
 */
import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AGENTS_CLAUDE_CURSOR_RE = /^\.(?:agents|claude|cursor)\//;
const TSCONFIG_JSON_RE = /(?:^|\/)tsconfig[^/]*\.json$/;

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const IS_WINDOWS = process.platform === "win32";

const BIOME_FILES = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts|json|jsonc|css|html)$/;
const CODE_AREAS = /^(?:apps|packages)\//;

/**
 * Check table. `when` decides from the changed paths whether the check applies. Order is the
 * display order, not the run order: everything runs in parallel.
 *
 * `mutatesDist` marks checks that rebuild package `dist` folders. They run one at a time after the
 * read-only checks, because a parallel typecheck would read a half-deleted `dist` and fail at random.
 *
 * @type {{ mutatesDist?: boolean, name: string, when: (files: string[]) => boolean, command: "biome" | "node" | "pnpm", args: (files: string[], base: string) => string[] }[]}
 */
const CHECKS = [
  {
    args: (files) => ["check", "--no-errors-on-unmatched", ...files.filter(isBiomeFile)],
    command: "biome",
    name: "biome",
    when: (files) => files.some((file) => isBiomeFile(file) || isBiomeRuleFile(file)),
  },
  {
    args: (_files, base) => ["scripts/check/check-no-workarounds.mjs", "--worktree", base],
    command: "node",
    name: "stopgap-wording",
    when: () => true,
  },
  {
    args: (_files, base) => ["exec", "turbo", "run", "check:types", `--filter=...[${base}]`],
    command: "pnpm",
    name: "types",
    when: (files) => files.some((file) => CODE_AREAS.test(file) && !file.endsWith(".md")),
  },
  {
    args: () => ["run", "test:check-scripts"],
    command: "pnpm",
    name: "check-script-tests",
    when: (files) =>
      files.some((file) => file.startsWith("scripts/check/") || file.startsWith("biome/plugins/")),
  },
  {
    args: () => ["run", "test:sample-data"],
    command: "pnpm",
    name: "sample-data",
    when: (files) => files.some((file) => file.startsWith("packages/tests/sample-data/")),
  },
  {
    // The importer tests read the sample corpus and the API import code, so both can break them.
    args: () => ["run", "test:importers"],
    command: "pnpm",
    name: "importer-tests",
    when: (files) =>
      files.some(
        (file) =>
          file.startsWith("packages/tests/importers/") ||
          file.startsWith("packages/tests/sample-data/") ||
          file.startsWith("apps/api/src/routes/import/") ||
          file.startsWith("apps/api/src/domains/import/") ||
          file.startsWith("apps/api/src/lib/integrations/mapy.ts"),
      ),
  },
  {
    args: () => ["run", "check:agent-files"],
    command: "pnpm",
    name: "agent-files",
    when: (files) => files.some((file) => AGENTS_CLAUDE_CURSOR_RE.test(file)),
  },
  {
    args: () => ["run", "check:package-imports"],
    command: "pnpm",
    name: "package-imports",
    when: (files) => files.some((file) => file.endsWith("package.json") || CODE_AREAS.test(file)),
  },
  {
    args: () => ["run", "check:tsconfig-extends"],
    command: "pnpm",
    name: "tsconfig-extends",
    when: (files) =>
      files.some(
        (file) => TSCONFIG_JSON_RE.test(file) || file.startsWith("packages/typescript-config/"),
      ),
  },
  {
    args: () => ["run", "check:input-safety"],
    command: "pnpm",
    name: "input-safety",
    when: (files) =>
      files.some(
        (file) =>
          file.startsWith("apps/api/src/") ||
          file.startsWith("scripts/check/check-input-safety") ||
          file.startsWith("biome/plugins/"),
      ),
  },
  {
    args: () => ["run", "check:diagnostic-messages"],
    command: "pnpm",
    name: "diagnostic-messages",
    when: (files) =>
      files.some((file) => file.startsWith("scripts/check/") || file.startsWith("biome/plugins/")),
  },
  {
    args: () => ["run", "check:docs"],
    command: "pnpm",
    name: "docs",
    when: (files) => files.some((file) => file.startsWith("docs/")),
  },
  {
    args: () => ["run", "check:i18n"],
    command: "pnpm",
    mutatesDist: true,
    name: "i18n",
    when: (files) => files.some((file) => file.startsWith("packages/translations/")),
  },
  {
    args: () => ["run", "check:api-errors"],
    command: "pnpm",
    mutatesDist: true,
    name: "api-errors",
    when: (files) =>
      files.some(
        (file) => file.startsWith("apps/api/src/") || file.startsWith("packages/schemas/src/"),
      ),
  },
  {
    args: () => ["run", "check:openapi"],
    command: "pnpm",
    mutatesDist: true,
    name: "openapi",
    when: (files) =>
      files.some(
        (file) => file.startsWith("apps/api/src/") || file.startsWith("packages/schemas/src/"),
      ),
  },
  {
    args: () => ["run", "env:check"],
    command: "pnpm",
    mutatesDist: true,
    name: "env",
    when: (files) =>
      files.some(
        (file) => file.startsWith("packages/helpers/src/env/") || file.startsWith("scripts/env/"),
      ),
  },
];

function isBiomeFile(file) {
  return BIOME_FILES.test(file);
}

/** Biome config or a GritQL plugin: a change can add errors to files the diff did not touch. */
function isBiomeRuleFile(file) {
  return file === "biome.json" || file.startsWith("biome/plugins/");
}

/** The checks that apply to a set of changed paths. */
function planChecks(files, only = null) {
  return CHECKS.filter((check) => (only ? only.includes(check.name) : check.when(files)));
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

/** Changed paths: committed, staged and unstaged edits against the merge base, plus new files. */
function changedFiles(base) {
  const mergeBase = git(["merge-base", "HEAD", base]).trim();
  const tracked = git(["diff", "--name-only", "--diff-filter=ACMR", mergeBase]);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]);
  return [
    ...new Set(
      `${tracked}\n${untracked}`
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

/** Windows limits a command line to about 32k characters, so file lists run in batches. */
const BATCH_SIZE = 60;
const WHOLE_PROJECT_THRESHOLD = 150;

function capture(command, args, { shell = false } = {}) {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      shell,
    });
    child.on("error", (error) => {
      resolve({
        code: 1,
        output: `${output}
${error.message}`,
      });
    });
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

async function runCheck(check, files, base) {
  const started = Date.now();
  let code = 0;
  let output = "";

  if (check.command === "biome") {
    const biome = require.resolve("@biomejs/biome/bin/biome");
    const targets = files.filter(isBiomeFile);
    // One whole-project run is far faster than many batches once most of the repo changed.
    // A changed rule must also re-lint the files the diff did not touch.
    if (targets.length > WHOLE_PROJECT_THRESHOLD || files.some(isBiomeRuleFile)) {
      ({ code, output } = await capture(process.execPath, [biome, "check", "--colors=off", "."]));
      return { check, code, output, seconds: (Date.now() - started) / 1000 };
    }
    for (let index = 0; index < targets.length; index += BATCH_SIZE) {
      const batch = targets.slice(index, index + BATCH_SIZE);
      const result = await capture(process.execPath, [
        biome,
        "check",
        "--no-errors-on-unmatched",
        ...batch,
      ]);
      output += result.output;
      code ||= result.code;
    }
  } else if (check.command === "node") {
    ({ code, output } = await capture(process.execPath, check.args(files, base)));
  } else {
    ({ code, output } = await capture(IS_WINDOWS ? "pnpm.cmd" : "pnpm", check.args(files, base), {
      shell: IS_WINDOWS,
    }));
  }

  return { check, code, output, seconds: (Date.now() - started) / 1000 };
}

/** True while `pnpm run dev` owns this checkout: its watchers hold the package `dist` folders. */
function devSessionRunning() {
  try {
    const lock = JSON.parse(readFileSync(join(ROOT, ".temp/dev.lock"), "utf8"));
    process.kill(lock.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * One `check:changed` run per checkout at a time.
 *
 * Several checks clean and rebuild package `dist` folders. Two runs in the same checkout (two
 * agent sessions, each with a Stop hook, or a person and an agent) rebuilt the same `dist` at
 * once and failed with ENOTEMPTY or "Cannot find module". A second run waits for the first. A
 * lock whose process is gone is replaced.
 */
const LOCK_PATH = join(ROOT, ".temp", "check-changed.lock");
const LOCK_WAIT_MS = 10 * 60_000;

function lockHolderAlive() {
  try {
    const { pid } = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function acquireRunLock() {
  mkdirSync(join(ROOT, ".temp"), { recursive: true });
  const started = Date.now();
  let announced = false;
  for (;;) {
    try {
      const fd = openSync(LOCK_PATH, "wx");
      writeSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      closeSync(fd);
      process.on("exit", releaseRunLock);
      return;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }
    }
    if (!lockHolderAlive()) {
      releaseRunLock(true);
      continue;
    }
    if (Date.now() - started > LOCK_WAIT_MS) {
      throw new Error(`check:changed: another run still holds ${LOCK_PATH} after 10 minutes`);
    }
    if (!announced) {
      console.log("check:changed: another run is in progress in this checkout, waiting for it");
      announced = true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }
}

function releaseRunLock(force = false) {
  try {
    if (!force) {
      const { pid } = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
      if (pid !== process.pid) {
        return;
      }
    }
    unlinkSync(LOCK_PATH);
  } catch {
    // Already gone.
  }
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function main() {
  const base = argValue("--base") ?? "origin/main";
  const only = argValue("--only")?.split(",") ?? null;
  const files = changedFiles(base);

  if (files.length === 0) {
    console.log(`check:changed: no changes against ${base}`);
    return;
  }

  const plan = planChecks(files, only);
  console.log(`check:changed: ${files.length} changed file(s), ${plan.length} check(s)`);
  if (process.argv.includes("--list")) {
    for (const check of plan) {
      console.log(`  - ${check.name}`);
    }
    return;
  }

  await acquireRunLock();
  const readOnly = plan.filter((check) => !check.mutatesDist);
  const mutating = plan.filter((check) => check.mutatesDist);
  const results = await Promise.all(readOnly.map((check) => runCheck(check, files, base)));
  const skipped = [];
  for (const check of mutating) {
    if (devSessionRunning()) {
      skipped.push(check.name);
      continue;
    }
    results.push(await runCheck(check, files, base));
  }
  const failed = results.filter((result) => result.code !== 0);

  for (const result of results) {
    console.log(
      `  ${result.code === 0 ? "ok  " : "FAIL"} ${result.check.name} (${result.seconds.toFixed(1)}s)`,
    );
  }
  for (const result of failed) {
    const tail = result.output.trim().split("\n").slice(-40).join("\n");
    console.log(`\n--- ${result.check.name} ---\n${tail}`);
  }

  if (skipped.length > 0) {
    console.log(
      `\nSKIPPED (a dev session holds the package dist folders): ${skipped.join(", ")}. Run \`pnpm run kill:dev\`, then \`pnpm run check:changed\` again before you report. CI runs them.`,
    );
  }
  if (failed.length > 0) {
    console.log(
      `\ncheck:changed: ${failed.length} failed. Fix the cause (not the symptom) and re-run \`pnpm run check:changed\`.`,
    );
    process.exitCode = 1;
    return;
  }
  if (skipped.length > 0) {
    console.log(
      `\ncheck:changed: every check that ran passed, ${skipped.length} skipped. Not done until those run.`,
    );
    process.exitCode = 3;
    return;
  }
  console.log("\ncheck:changed: all checks passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

export { CHECKS, isBiomeRuleFile, planChecks };
