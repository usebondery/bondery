/**
 * Ensures @bondery/schemas does not depend on other @bondery/* packages.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const TS_TSX_RE = /\.(ts|tsx)$/;

const check = createCheck("check-contracts-no-internal-deps");

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const srcRoot = join(packageRoot, "src");

const forbiddenPattern = /@bondery\//;

function collectSourceFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (TS_TSX_RE.test(entry) && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const file of collectSourceFiles(srcRoot)) {
  const content = readFileSync(file, "utf8");
  if (forbiddenPattern.test(content)) {
    check.add(relative(packageRoot, file));
  }
}

check.ok();
