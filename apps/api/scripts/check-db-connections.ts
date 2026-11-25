// Fails when a Postgres connection does not take its TLS settings from @bondery/db
// (pgConnectionConfig / prismaCliUrl). Rules: scripts/db-connections.ts.
//
// Usage: pnpm exec tsx scripts/check-db-connections.ts

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";
import { findDbConnectionViolations } from "./db-connections.ts";

const check = createCheck("check-db-connections");

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

/** Folders that can open database connections, relative to the repo root. */
const ROOTS = [
  "apps/api/src",
  "apps/api/scripts",
  "packages/db/src",
  "packages/db/scripts",
  "scripts",
  "deploy",
];
const SINGLE_FILES = ["packages/db/prisma.config.ts"];
const SKIP_DIRS = new Set(["node_modules", "dist", "generated", ".turbo"]);
const SOURCE_FILE = /\.(?:ts|mts|js|mjs)$/u;
const TEST_FILE = /\.test\.(?:ts|mts|js|mjs)$/u;

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (SOURCE_FILE.test(entry) && !TEST_FILE.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const files = [
  ...ROOTS.flatMap((root) => walk(join(repoRoot, root))),
  ...SINGLE_FILES.map((file) => join(repoRoot, file)),
];

let checked = 0;
for (const file of files) {
  const rel = relative(repoRoot, file).replace(/\\/gu, "/");
  // This rule file names the patterns it forbids.
  if (rel === "apps/api/scripts/db-connections.ts") {
    continue;
  }
  checked += 1;
  for (const violation of findDbConnectionViolations(readFileSync(file, "utf8"), rel)) {
    check.add(`${rel}:${violation.line} ${violation.message}`);
  }
}

check.ok(`${checked} files`);
