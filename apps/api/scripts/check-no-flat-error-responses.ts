/**
 * CI guard: ban legacy flat HTTP error response shapes in API and BFF code.
 *
 * Usage: pnpm exec tsx scripts/check-no-flat-error-responses.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-no-flat-error-responses");

const repoRoot = join(import.meta.dirname, "..", "..", "..");
const scanRoots = [
  join(repoRoot, "apps", "api", "src"),
  join(repoRoot, "apps", "webapp", "src", "app", "api"),
  join(repoRoot, "apps", "webapp", "src", "lib", "api"),
];

const FLAT_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "top-level { code, error } object",
    regex: /\{\s*code:\s*["'][a-z0-9_]+["'],\s*error:\s*["']/u,
  },
  {
    name: "reply.send({ error: string })",
    regex: /\.send\(\{\s*error:\s*["'`]/u,
  },
  {
    name: "Response.json({ code: ... })",
    regex: /Response\.json\(\s*\{\s*code:\s*["']/u,
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
    const rel = relative(repoRoot, filePath).replace(/\\/gu, "/");
    const lines = readFileSync(filePath, "utf8").split("\n");

    for (let i = 0; i < lines.length; i += 1) {
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

for (const violation of violations) {
  check.add(violation);
}

check.ok();
