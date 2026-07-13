/**
 * One-time migration: replace SCREAMING_SNAKE error code literals with snake_case catalog codes.
 *
 * Usage: npx tsx scripts/codemod-error-codes-snake.ts
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { API_ERROR_CODE_ENTRIES } from "@bondery/schemas/errors";

const apiRoot = join(import.meta.dirname, "..");
const targets = [join(apiRoot, "src"), join(apiRoot, "scripts")];

const legacyToSnake = new Map<string, string>();
for (const [snake, def] of Object.entries(API_ERROR_CODE_ENTRIES)) {
  const legacy = snake.toUpperCase();
  legacyToSnake.set(legacy, def.code);
}

// Also map ErrorCodes.KEY style references
const legacyKeys = [...legacyToSnake.keys()].sort((a, b) => b.length - a.length);

function migrateContent(content: string): string {
  let next = content;
  for (const legacy of legacyKeys) {
    const snake = legacyToSnake.get(legacy);
    if (!snake) {
      continue;
    }
    next = next.replaceAll(`"${legacy}"`, `"${snake}"`);
    next = next.replaceAll(`ErrorCodes.${legacy}`, `"${snake}"`);
  }
  return next;
}

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.endsWith(".ts")) {
      continue;
    }
    const original = readFileSync(path, "utf8");
    const migrated = migrateContent(original);
    if (migrated !== original) {
      writeFileSync(path, migrated, "utf8");
      console.log(`updated ${path}`);
    }
  }
}

for (const dir of targets) {
  walk(dir);
}

console.log("codemod-error-codes-snake: done");
