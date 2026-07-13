/**
 * CI guard: ban legacy flat HTTP error response shapes in API and BFF code.
 *
 * Usage: npx tsx scripts/check-no-flat-error-responses.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = join(import.meta.dirname, "..", "..", "..");
const scanRoots = [
  join(repoRoot, "apps", "api", "src"),
  join(repoRoot, "apps", "webapp", "src", "app", "api"),
  join(repoRoot, "apps", "webapp", "src", "lib", "api"),
];

const FLAT_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "top-level { code, error } object",
    regex: /\{\s*code:\s*["'][a-z0-9_]+["'],\s*error:\s*["']/,
  },
  {
    name: "reply.send({ error: string })",
    regex: /\.send\(\{\s*error:\s*["'`]/,
  },
  {
    name: "Response.json({ code: ... })",
    regex: /Response\.json\(\s*\{\s*code:\s*["']/,
  },
];

const violations: string[] = [];

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectTsFiles(full));
      continue;
    }
    if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

for (const root of scanRoots) {
  for (const filePath of collectTsFiles(root)) {
    const rel = relative(repoRoot, filePath).replace(/\\/g, "/");
    const lines = readFileSync(filePath, "utf8").split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
        continue;
      }

      for (const { name, regex } of FLAT_PATTERNS) {
        if (regex.test(line)) {
          violations.push(`${rel}:${i + 1}: legacy flat error (${name})`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Legacy flat API error responses found:\n");
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}

console.error("check-no-flat-error-responses: OK");
