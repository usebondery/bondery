/**
 * Ban raw error.message in user-facing notification UI in webapp + mobile.
 *
 * Usage: node scripts/check-user-facing-errors.mjs
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const targets = [join(repoRoot, "apps", "webapp", "src"), join(repoRoot, "apps", "mobile", "src")];

const violations = [];
const banned = [
  /error instanceof Error \? error\.message/,
  /\berror\.message\b.*(?:description|title|Alert|notification|toast|showNotification)/i,
  /description:\s*error\.message/,
];

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path));
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

for (const root of targets) {
  for (const file of collectFiles(root)) {
    const rel = relative(repoRoot, file).replace(/\\/g, "/");
    if (
      rel.includes("/lib/api/") ||
      rel.includes("getUserFacingError") ||
      rel.includes("/lib/sync/sync-logger")
    ) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("getUserFacingError") || line.includes("getUserMessage(")) {
        continue;
      }
      if (line.includes("console.") || line.includes("//")) {
        continue;
      }
      for (const pattern of banned) {
        if (pattern.test(line)) {
          violations.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error("check-user-facing-errors: violations found:\n");
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log("check-user-facing-errors: OK");
