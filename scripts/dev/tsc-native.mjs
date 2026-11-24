#!/usr/bin/env node
/**
 * Run TypeScript 7 `tsc`. Resolves from cwd first (isolated linker), then repo root.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTypescriptTsc } from "../pkg/resolve-typescript-tsc.mjs";

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

  const tsc = resolveTypescriptTsc([process.cwd(), root]);
  if (!tsc) {
    console.error("tsc-native: could not resolve TypeScript compiler");
    process.exitCode = 1;
    return;
  }

  const result = spawnSync(process.execPath, [tsc, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
}

main();
