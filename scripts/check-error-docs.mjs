/**
 * Fail CI when any catalog code lacks a docs page on the website.
 *
 * Usage: node scripts/check-error-docs.mjs
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_ERROR_CODES } from "@bondery/schemas/errors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const pageTemplate = join(
  repoRoot,
  "apps",
  "website",
  "src",
  "app",
  "docs",
  "api",
  "errors",
  "[code]",
  "page.tsx",
);

const violations = [];

if (!existsSync(pageTemplate)) {
  violations.push(
    "Missing dynamic docs page at apps/website/src/app/docs/api/errors/[code]/page.tsx",
  );
}

if (
  !existsSync(join(repoRoot, "apps", "website", "src", "app", "docs", "api", "errors", "page.tsx"))
) {
  violations.push("Missing docs index at apps/website/src/app/docs/api/errors/page.tsx");
}

if (violations.length > 0) {
  console.error("check-error-docs: violations found:\n");
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log(`check-error-docs: OK (${API_ERROR_CODES.length} codes served by dynamic route)`);
