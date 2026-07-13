// Fails when lib/ modules import from routes/ or services/ (layering violation).
//
// Usage: npx tsx scripts/check-lib-imports.ts

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const libRoot = join(__dirname, "..", "src", "lib");

const FORBIDDEN_IMPORT = /from\s+["'](?:\.\.\/)*(?:routes|services)\//;

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (entry.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

const violations: string[] = [];

for (const file of walk(libRoot)) {
  const rel = relative(join(__dirname, "..", "src"), file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf8");
  if (FORBIDDEN_IMPORT.test(content)) {
    violations.push(rel);
  }
}

if (violations.length > 0) {
  console.error(
    "check-lib-imports: lib/ must not import from routes/ or services/:\n" +
      violations.map((v) => `  - ${v}`).join("\n"),
  );
  process.exit(1);
}

console.log("check-lib-imports: ok");
