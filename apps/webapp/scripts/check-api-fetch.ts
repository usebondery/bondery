/**
 * Guards against banned API fetch patterns in client code.
 * Run via: pnpm run check:api-fetch
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-api-fetch");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");

type Violation = { file: string; rule: string; detail: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
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
  const normalized = rel.replace(/\\/g, "/");
  return normalized.startsWith("lib/api/") || normalized === "lib/sync/sync-wake-client.ts";
}

function isApiRouteFile(rel: string): boolean {
  const normalized = rel.replace(/\\/g, "/");
  return normalized.startsWith("app/api/");
}

function checkApiRouteFile(absPath: string): Violation[] {
  const rel = relative(WEBAPP_SRC, absPath);
  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  if (!isApiRouteFile(rel)) {
    return violations;
  }

  if (!/\bserverApiFetch\b/.test(content)) {
    return violations;
  }

  if (/\bbffProxyFetch\b/.test(content)) {
    return violations;
  }

  if (/transportPolicy:\s*false/.test(content)) {
    return violations;
  }

  violations.push({
    detail: "app/api route handlers must use bffProxyFetch instead of serverApiFetch",
    file: rel,
    rule: "api-route-use-bff-proxy",
  });

  return violations;
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

  if (
    /import\s*\{[^}]*\bAPI_URL\b[^}]*\}\s*from\s*["']@\/lib\/platform\/config["']/.test(content)
  ) {
    violations.push({
      detail: 'Client file imports API_URL from "@/lib/platform/config"',
      file: rel,
      rule: "no-api-url-in-client",
    });
  }

  if (/\bfetch\s*\(\s*[`'"]\s*\$\{\s*API_URL/.test(content)) {
    violations.push({
      detail: "Client file fetches API_URL directly",
      file: rel,
      rule: "no-fetch-api-url-in-client",
    });
  }

  if (/\bfetch\s*\(\s*[`'"]\s*\$\{\s*API_ROUTES/.test(content)) {
    violations.push({
      detail: "Use clientApiFetch/clientApiJson instead of raw fetch(API_ROUTES...)",
      file: rel,
      rule: "no-raw-fetch-api-routes",
    });
  }

  if (/\bfetch\s*\(\s*API_ROUTES\./.test(content)) {
    violations.push({
      detail: "Use clientApiFetch/clientApiJson instead of raw fetch(API_ROUTES...)",
      file: rel,
      rule: "no-raw-fetch-api-routes",
    });
  }

  return violations;
}

function main(): void {
  const files = walk(WEBAPP_SRC);
  const violations = files.flatMap((file) => checkFile(file).concat(checkApiRouteFile(file)));

  for (const violation of violations) {
    check.add(`[${violation.rule}] ${violation.file}: ${violation.detail}`);
  }

  check.ok();
}

main();
