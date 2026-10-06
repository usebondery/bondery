#!/usr/bin/env node
/**
 * Build helpers, regenerate committed env examples + turbo.json, verify version sync.
 *
 *   pnpm run env:sync
 *   pnpm run env:sync -- --stage   # also `git add` outputs (pre-commit)
 */

import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const stage = process.argv.includes("--stage");

function run(command, cwd = root) {
  execSync(command, { cwd, shell: true, stdio: "inherit" });
}

run("node --run build", join(root, "packages/helpers"));

const exampleArgs = stage ? " --stage" : "";
run(`node scripts/env/generate-env-examples.mjs${exampleArgs}`);

run("pnpm run check:versions");
