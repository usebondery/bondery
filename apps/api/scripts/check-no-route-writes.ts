// Fails when route modules call database write methods directly (migration guard).
//
// Usage: pnpm exec tsx scripts/check-no-route-writes.ts

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-no-route-writes");

const __dirname = dirname(fileURLToPath(import.meta.url));
const routesRoot = join(__dirname, "..", "src", "routes");
const allowlistPath = join(__dirname, "route-writes-allowlist.json");

const WRITE_PATTERN = /\.from\([^)]+\)\s*\.(?<group1>insert|update|delete|upsert)\s*\(/u;

const allowlist = new Set(
  (JSON.parse(readFileSync(allowlistPath, "utf8")) as string[]).map((p) => p.replace(/\\/gu, "/")),
);

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

for (const file of walk(routesRoot)) {
  const rel = relative(routesRoot, file).replace(/\\/gu, "/");
  const content = readFileSync(file, "utf8");
  if (!WRITE_PATTERN.test(content)) {
    continue;
  }
  if (allowlist.has(rel)) {
    continue;
  }
  violations.push(rel);
}

for (const violation of violations) {
  check.add(violation);
}

check.ok();
