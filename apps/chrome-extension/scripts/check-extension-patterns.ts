/**
 * Guards extension architecture boundaries.
 * Run via: pnpm run check-extension-patterns -w chrome-extension
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const FROM_SHARED_IMPORT_RE = /\bfrom\s+["'][./]*(?:src\/)?shared\//u;
const FROM_LIB_API_IMPORT_RE = /\bfrom\s+["'][^"']*lib\/api\//u;
const FROM_MANTINE_NEXT_IMPORT_RE = /\bfrom\s+["']@bondery\/mantine-next["']/u;
const FROM_UTILS_IMPORT_RE = /\bfrom\s+["'][./]*(?:src\/)?utils\//u;
const SOURCE_FILE_EXT_RE = /\.(?<group1>tsx?|jsx?)$/u;
const report = createCheck("check-extension-patterns");

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
    } else if (SOURCE_FILE_EXT_RE.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function isApiAllowed(rel: string): boolean {
  const n = rel.replace(/\\/gu, "/");
  return n.startsWith("lib/api/") || n.startsWith("features/background/");
}

function checkFile(abs: string): Violation[] {
  const rel = relative(SRC, abs).replace(/\\/gu, "/");
  const text = readFileSync(abs, "utf8");
  const violations: Violation[] = [];

  if (FROM_UTILS_IMPORT_RE.test(text) || FROM_SHARED_IMPORT_RE.test(text)) {
    violations.push({
      detail: "Import from lib/ or features/ instead of utils/ or shared/",
      file: rel,
      rule: "no-legacy-utils-shared",
    });
  }

  if (!isApiAllowed(rel) && FROM_LIB_API_IMPORT_RE.test(text)) {
    violations.push({
      detail: "lib/api imports are limited to features/background/ and lib/api/",
      file: rel,
      rule: "api-only-in-background",
    });
  }

  if (FROM_MANTINE_NEXT_IMPORT_RE.test(text)) {
    violations.push({
      detail:
        "Import @bondery/mantine-next subpaths (e.g. /ActionIconButton, /theme). The package barrel re-exports next/link, which crashes in the extension (process is not defined)",
      file: rel,
      rule: "no-mantine-next-barrel",
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

for (const violation of violations) {
  report.add(`[${violation.rule}] ${violation.file}: ${violation.detail}`);
}

report.ok();
