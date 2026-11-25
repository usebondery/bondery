// Fails when ioredis clients are created outside the shared Redis module.
//
// Usage: pnpm exec tsx scripts/check-redis-singleton.ts

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-redis-singleton");

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..", "src");

const ALLOWLIST = new Set(["lib/data/redis.ts", "lib/health/probes.ts"]);

const REDIS_PATTERN = /\bnew\s+Redis\s*\(/u;

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

const violations: string[] = [];

for (const file of walk(srcRoot)) {
  const rel = relative(srcRoot, file).replace(/\\/gu, "/");
  if (ALLOWLIST.has(rel)) {
    continue;
  }

  const content = readFileSync(file, "utf8");
  if (REDIS_PATTERN.test(content)) {
    violations.push(rel);
  }
}

for (const violation of violations) {
  check.add(violation);
}

check.ok();
