// Fails when lib/ modules import from routes/ or services/ (layering violation).
//
// Usage: pnpm exec tsx scripts/check-lib-imports.ts

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-lib-imports");

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..", "src");
const libRoot = join(srcRoot, "lib");

const FORBIDDEN_IMPORT = /from\s+["'](?:\.\.\/)*(?:routes|services)\//;

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (entry.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

const violations: string[] = [];

for (const file of walk(libRoot)) {
  const rel = relative(srcRoot, file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf8");
  if (FORBIDDEN_IMPORT.test(content)) {
    violations.push(rel);
  }
}

for (const violation of violations) {
  check.add(violation);
}

check.ok();
