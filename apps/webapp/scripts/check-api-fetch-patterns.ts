/**
 * Guards against banned API fetch patterns in client code.
 * Run via: npm run check-api-fetch
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");
const STRICT = process.env.CHECK_API_FETCH_STRICT === "1";

type Violation = { file: string; rule: string; detail: string };

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

function isClientFile(content: string): boolean {
  return /^["']use client["'];?\s*$/m.test(content);
}

function isAllowedClientFetchFile(rel: string): boolean {
  return rel.replace(/\\/g, "/").startsWith("lib/api/");
}

function checkFile(absPath: string): Violation[] {
  const rel = relative(WEBAPP_SRC, absPath);
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (!isClientFile(content)) {
    return violations;
  }

  if (isAllowedClientFetchFile(rel)) {
    return violations;
  }

  if (/import\s*\{[^}]*\bAPI_URL\b[^}]*\}\s*from\s*["']@\/lib\/config["']/.test(content)) {
    violations.push({
      file: rel,
      rule: "no-api-url-in-client",
      detail: 'Client file imports API_URL from "@/lib/config"',
    });
  }

  if (/\bfetch\s*\(\s*[`'"]\s*\$\{\s*API_URL/.test(content)) {
    violations.push({
      file: rel,
      rule: "no-fetch-api-url-in-client",
      detail: "Client file fetches API_URL directly",
    });
  }

  if (STRICT && /\bfetch\s*\(\s*[`'"]\s*\$\{\s*API_ROUTES/.test(content)) {
    violations.push({
      file: rel,
      rule: "no-raw-fetch-api-routes",
      detail: "Use clientApiFetch/clientApiJson instead of raw fetch(API_ROUTES...)",
    });
  }

  if (STRICT && /\bfetch\s*\(\s*API_ROUTES\./.test(content)) {
    violations.push({
      file: rel,
      rule: "no-raw-fetch-api-routes",
      detail: "Use clientApiFetch/clientApiJson instead of raw fetch(API_ROUTES...)",
    });
  }

  return violations;
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = files.flatMap(checkFile);

  if (violations.length === 0) {
    console.log("check-api-fetch-patterns: OK");
    return;
  }

  console.error("check-api-fetch-patterns: violations found\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}\n    ${v.detail}`);
  }
  process.exit(1);
}

main();
