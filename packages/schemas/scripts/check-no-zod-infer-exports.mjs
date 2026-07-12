#!/usr/bin/env node
/**
 * Fails if any public schemas source file exports types via z.infer / z.input / z.output.
 * Allowed only in *.contract.ts modules.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..", "src");
const forbidden = /export\s+type\s+\w+\s*=\s*z\.(infer|input|output)\s*</;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") {
        continue;
      }
      walk(full, acc);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".contract.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

const violations = [];
for (const file of walk(root)) {
  const rel = file.slice(root.length + 1);
  const content = readFileSync(file, "utf8");
  if (forbidden.test(content)) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error("check-no-zod-infer-exports: forbidden z.infer/z.input/z.output exports:\n");
  for (const file of violations.sort()) {
    console.error(`  ${file}`);
  }
  process.exit(1);
}

console.log("check-no-zod-infer-exports: OK");
