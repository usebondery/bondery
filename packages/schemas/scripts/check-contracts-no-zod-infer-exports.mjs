#!/usr/bin/env node
/**
 * Fails if any public schemas source file exports types via z.infer / z.input / z.output.
 * Allowed only in *.contract.ts modules.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-contracts-no-zod-infer-exports");

const root = join(fileURLToPath(import.meta.url), "..", "..", "src");
const forbidden = /export\s+type\s+\w+\s*=\s*z\.(?<group1>infer|input|output)\s*</u;

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

for (const file of walk(root)) {
  const rel = file.slice(root.length + 1);
  const content = readFileSync(file, "utf8");
  if (forbidden.test(content)) {
    check.add(rel);
  }
}

check.ok();
