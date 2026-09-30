/**
 * Fail CI when any catalog code lacks a docs page on the website.
 *
 * Usage: node scripts/check/check-api-errors-catalog.mjs (pnpm run check:api-errors:catalog)
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_ERROR_CODES } from "@bondery/schemas/errors";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-api-errors-catalog");

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const docsCatchAll = join(
  repoRoot,
  "apps",
  "website",
  "src",
  "app",
  "(chromeless)",
  "docs",
  "[[...slug]]",
  "page.tsx",
);
const errorsMdxRoot = join(repoRoot, "docs", "api", "errors");

if (!existsSync(docsCatchAll)) {
  check.add(
    "Missing docs catch-all at apps/website/src/app/(chromeless)/docs/[[...slug]]/page.tsx",
  );
}

if (!existsSync(join(errorsMdxRoot, "index.mdx"))) {
  check.add("Missing docs index at docs/api/errors/index.mdx");
}

for (const code of API_ERROR_CODES) {
  if (!existsSync(join(errorsMdxRoot, `${code}.mdx`))) {
    check.add(`Missing docs page at docs/api/errors/${code}.mdx`);
  }
}

check.ok(`${API_ERROR_CODES.length} codes served by docs/api/errors/*.mdx`);
