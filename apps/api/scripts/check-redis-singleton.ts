// Fails when ioredis clients are created outside the shared Redis module.
//
// Usage: npx tsx scripts/check-redis-singleton.ts

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, "..", "src");

const ALLOWLIST = new Set(["lib/data/redis.ts", "lib/health/probes.ts"]);

const REDIS_PATTERN = /\bnew\s+Redis\s*\(/;

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
  const rel = relative(srcRoot, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) {
    continue;
  }

  const content = readFileSync(file, "utf8");
  if (REDIS_PATTERN.test(content)) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error(
    "Redis clients must be created in lib/data/redis.ts (health probes may use ephemeral clients):\n" +
      violations.map((v) => `  - ${v}`).join("\n"),
  );
  process.exit(1);
}

console.log("check-redis-singleton: ok");
