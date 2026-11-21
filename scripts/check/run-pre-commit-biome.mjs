#!/usr/bin/env node
/**
 * Pre-commit Biome: check and fix the staged files only.
 *
 * It used to run `biome check --write .` on the whole tree. That rewrote everyone's unstaged work
 * and blocked a commit on lint errors in files it did not contain, which breaks as soon as two
 * people or agents share a checkout. lefthook re-stages the fixed files (`stage_fixed` in
 * lefthook.yml). CI (`biome ci .`) still checks the whole repository.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const require = createRequire(import.meta.url);
  const biomeBin = require.resolve("@biomejs/biome/bin/biome");

  const result = spawnSync(
    process.execPath,
    [
      biomeBin,
      "check",
      "--write",
      "--staged",
      "--no-errors-on-unmatched",
      "--files-ignore-unknown=true",
    ],
    { cwd: root, stdio: "inherit" },
  );

  process.exitCode = result.status ?? 1;
}

main();
