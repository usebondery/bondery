#!/usr/bin/env node
/**
 * Moves "use client" before imports when the i18n codemod prepended hook imports above it.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../apps/webapp/src");

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "generated") {
        continue;
      }
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function fixUseClientOrder(content) {
  const normalized = content.replace(/^\uFEFF/, "");
  if (!/\buse client\b/.test(normalized)) {
    return content;
  }

  const lines = normalized.split("\n");
  const useClientIdx = lines.findIndex((line) => /^\s*["']use client["']\s*;?\s*$/.test(line));
  if (useClientIdx <= 0) {
    return normalized;
  }

  const before = lines.slice(0, useClientIdx);
  const misplacedImports = before.filter((line) => /^\s*import\s/.test(line));
  if (misplacedImports.length === 0) {
    return normalized;
  }

  const leading = before.filter((line) => line.trim() !== "" && !/^\s*import\s/.test(line));
  const after = lines.slice(useClientIdx + 1);
  while (after.length > 0 && after[0].trim() === "") {
    after.shift();
  }

  return [...leading, '"use client";', "", ...misplacedImports, ...after].join("\n");
}

let count = 0;
for (const file of walk(root)) {
  const before = readFileSync(file, "utf8");
  const after = fixUseClientOrder(before);
  if (after !== before) {
    writeFileSync(file, after);
    count++;
  }
}

console.log(`fix-use-client-order: updated ${count} files`);
