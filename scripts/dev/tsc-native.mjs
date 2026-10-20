#!/usr/bin/env node
/**
 * Run TypeScript 7 `tsc`. Resolves from cwd first (isolated linker), then repo root.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function resolveTsc() {
  for (const from of [process.cwd(), root]) {
    try {
      return createRequire(join(from, "package.json")).resolve("typescript/bin/tsc");
    } catch {
      // try next
    }
  }
  return null;
}

const tsc = resolveTsc();
if (!tsc) {
  console.error("tsc-native: could not resolve typescript/bin/tsc");
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsc, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
});
process.exit(result.status ?? 1);
