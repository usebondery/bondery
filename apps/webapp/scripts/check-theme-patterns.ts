/**
 * Guards theme write patterns: useMantineColorScheme only in ColorSchemeSync.
 * Run via: pnpm run check:theme-patterns
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const IMPORT_USEMANTINECOLORSCHEME = /import\s*\{[^}]*\buseMantineColorScheme\b/u;
const USEMANTINECOLORSCHEME = /\buseMantineColorScheme\s*\(/u;

const report = createCheck("check-theme-patterns");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");

const ALLOWED_USE_MANTINE_COLOR_SCHEME_FILES = new Set(["components/shell/ColorSchemeSync.tsx"]);

function usesMantineColorSchemeHook(source: string): boolean {
  const withoutLineComments = source.replace(/\/\/.*$/gmu, "");
  return (
    IMPORT_USEMANTINECOLORSCHEME.test(withoutLineComments) ||
    USEMANTINECOLORSCHEME.test(withoutLineComments)
  );
}

type Violation = { file: string; rule: string; detail: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];

  for (const file of walk(WEBAPP_SRC)) {
    const rel = relative(WEBAPP_SRC, file).replaceAll("\\", "/");
    if (!usesMantineColorSchemeHook(readFileSync(file, "utf8"))) {
      continue;
    }
    if (ALLOWED_USE_MANTINE_COLOR_SCHEME_FILES.has(rel)) {
      continue;
    }
    violations.push({
      detail:
        "useMantineColorScheme must only be used in ColorSchemeSync (session → Mantine one-way)",
      file: rel,
      rule: "theme-use-mantine-color-scheme",
    });
  }

  return violations;
}

const violations = collectViolations();

for (const violation of violations) {
  const message = `[${violation.rule}] ${violation.file}: ${violation.detail}`;
  report.add(message);
}

report.ok();
