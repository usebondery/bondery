#!/usr/bin/env node
/**
 * Run TypeScript 7 `tsc` from the monorepo root (hoisted `typescript` package).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsc = join(root, "node_modules/typescript/bin/tsc");

if (!existsSync(tsc)) {
  console.error("tsc-native: could not find node_modules/typescript/bin/tsc");
  process.exit(1);
}

const result = spawnSync(tsc, process.argv.slice(2), { cwd: process.cwd(), stdio: "inherit" });
process.exit(result.status ?? 1);
