/**
 * Guards extension architecture boundaries.
 * Run via: npm run check-extension-patterns --workspace=chrome-extension
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "src");

type Violation = { file: string; rule: string; detail: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") {
        continue;
      }
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function isApiAllowed(rel: string): boolean {
  const n = rel.replace(/\\/g, "/");
  return n.startsWith("lib/api/") || n.startsWith("features/background/");
}

function checkFile(abs: string): Violation[] {
  const rel = relative(SRC, abs).replace(/\\/g, "/");
  const text = readFileSync(abs, "utf8");
  const violations: Violation[] = [];

  if (
    /\bfrom\s+["'][./]*(?:src\/)?utils\//.test(text) ||
    /\bfrom\s+["'][./]*(?:src\/)?shared\//.test(text)
  ) {
    violations.push({
      detail: "Import from lib/ or features/ instead of utils/ or shared/",
      file: rel,
      rule: "no-legacy-utils-shared",
    });
  }

  if (!isApiAllowed(rel) && /\bfrom\s+["'][^"']*lib\/api\//.test(text)) {
    violations.push({
      detail: "lib/api imports are limited to features/background/ and lib/api/",
      file: rel,
      rule: "api-only-in-background",
    });
  }

  if (rel.startsWith("entrypoints/background/") && rel.endsWith("index.ts")) {
    const lines = text.split("\n").length;
    if (lines > 30) {
      violations.push({
        detail: `Background entrypoint has ${lines} lines; keep it a thin shell calling initBackground()`,
        file: rel,
        rule: "thin-background-entrypoint",
      });
    }
  }

  return violations;
}

const violations = walk(SRC).flatMap(checkFile);

if (violations.length > 0) {
  console.error("Extension pattern violations:\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

console.log("check-extension-patterns: ok");
