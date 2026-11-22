/**
 * Guards against webapp runtime imports of API-only @bondery/schemas surfaces.
 * Run via: pnpm run check:schemas-imports
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const JS_TS_EXTENSION = /\.(tsx?|jsx?)$/;

const check = createCheck("check-schemas-imports");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");

type Violation = { file: string; rule: string; detail: string };

const FORBIDDEN_RUNTIME_IMPORTS: Array<{ pattern: RegExp; rule: string; detail: string }> = [
  {
    detail: "Use @bondery/schemas for types/schemas; OpenAPI fixtures are API-only",
    pattern: /import\s+(?!type\s)\{[^}]*\}\s*from\s*["']@bondery\/schemas\/openapi(?:\/|["'])/,
    rule: "no-openapi-runtime-import",
  },
  {
    detail: "registerOpenApiComponentSchemas is API-only",
    pattern:
      /import\s+(?!type\s)\{[^}]*registerOpenApiComponentSchemas[^}]*\}\s*from\s*["']@bondery\/schemas["']/,
    rule: "no-openapi-registry-import",
  },
  {
    detail: "EXAMPLE_* fixtures must not be imported from the root schemas barrel",
    pattern:
      /import\s+(?!type\s)\{[^}]*\bEXAMPLE_[A-Z0-9_]+\b[^}]*\}\s*from\s*["']@bondery\/schemas["']/,
    rule: "no-example-from-root-barrel",
  },
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (JS_TS_EXTENSION.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function checkFile(absPath: string): Violation[] {
  const rel = relative(WEBAPP_SRC, absPath);
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  for (const { pattern, rule, detail } of FORBIDDEN_RUNTIME_IMPORTS) {
    if (pattern.test(content)) {
      violations.push({ detail, file: rel, rule });
    }
  }

  return violations;
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = files.flatMap(checkFile);

  for (const violation of violations) {
    check.add(`[${violation.rule}] ${violation.file}: ${violation.detail}`);
  }

  check.ok();
}

main();
