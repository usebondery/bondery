// Fails when route modules call Supabase write methods directly (migration guard).
//
// Usage: npx tsx scripts/check-no-route-writes.ts

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const routesRoot = join(__dirname, "..", "src", "routes");
const allowlistPath = join(__dirname, "route-writes-allowlist.json");

const WRITE_PATTERN = /\.from\([^)]+\)\s*\.(insert|update|delete|upsert)\s*\(/;

const allowlist = new Set(
  (JSON.parse(readFileSync(allowlistPath, "utf8")) as string[]).map((p) => p.replace(/\\/g, "/")),
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
  const rel = relative(routesRoot, file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf8");
  if (!WRITE_PATTERN.test(content)) {
    continue;
  }
  if (allowlist.has(rel)) {
    continue;
  }
  violations.push(rel);
}

if (violations.length > 0) {
  console.error(
    "check-no-route-writes: Supabase writes in routes not on allowlist:\n" +
      violations.map((v) => `  - ${v}`).join("\n"),
  );
  process.exit(1);
}

console.log("check-no-route-writes: ok");
