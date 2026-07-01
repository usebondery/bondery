/**
 * Guards against webapp runtime imports of API-only @bondery/schemas surfaces.
 * Run via: npm run check-schemas-imports
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");
const STRICT = process.env.CHECK_SCHEMAS_IMPORTS_STRICT === "1";

type Violation = { file: string; rule: string; detail: string };

const FORBIDDEN_RUNTIME_IMPORTS: Array<{ pattern: RegExp; rule: string; detail: string }> = [
  {
    pattern: /import\s+(?!type\s)\{[^}]*\}\s*from\s*["']@bondery\/schemas\/openapi(?:\/|["'])/,
    rule: "no-openapi-runtime-import",
    detail: "Use @bondery/schemas for types/schemas; OpenAPI fixtures are API-only",
  },
  {
    pattern: /import\s+(?!type\s)\{[^}]*registerOpenApiComponentSchemas[^}]*\}\s*from\s*["']@bondery\/schemas["']/,
    rule: "no-openapi-registry-import",
    detail: "registerOpenApiComponentSchemas is API-only",
  },
  {
    pattern: /import\s+(?!type\s)\{[^}]*\bEXAMPLE_[A-Z0-9_]+\b[^}]*\}\s*from\s*["']@bondery\/schemas["']/,
    rule: "no-example-from-root-barrel",
    detail: "EXAMPLE_* fixtures must not be imported from the root schemas barrel",
  },
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function checkFile(absPath: string): Violation[] {
  const rel = relative(WEBAPP_SRC, absPath);
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (!STRICT) {
    return violations;
  }

  for (const { pattern, rule, detail } of FORBIDDEN_RUNTIME_IMPORTS) {
    if (pattern.test(content)) {
      violations.push({ file: rel, rule, detail });
    }
  }

  return violations;
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = files.flatMap(checkFile);

  if (violations.length === 0) {
    console.log("check-schemas-imports: OK");
    return;
  }

  console.error("check-schemas-imports: violations found\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

main();
