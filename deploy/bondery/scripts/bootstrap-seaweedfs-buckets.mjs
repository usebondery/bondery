#!/usr/bin/env node
/**
 * @deprecated Use `pnpm run setup:seaweedfs` (compiled API CLI) instead.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const result = spawnSync("npm", ["run", "setup:seaweedfs"], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

process.exitCode = result.status ?? 1;
