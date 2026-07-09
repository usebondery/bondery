/**
 * Fail CI when catalog codes are missing from common.errors.api in en/cs/de.
 *
 * Usage: node scripts/check-api-error-translations.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_ERROR_CODES } from "@bondery/schemas/errors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = join(__dirname, "..", "packages", "translations", "src", "locales");
const locales = ["en", "cs", "de"];

const violations = [];

for (const locale of locales) {
  const common = JSON.parse(readFileSync(join(localesRoot, locale, "common.json"), "utf8"));
  const apiErrors = common.errors?.api ?? {};

  for (const code of API_ERROR_CODES) {
    const value = apiErrors[code];
    if (typeof value !== "string" || value.trim().length === 0) {
      violations.push(`${locale}: missing common.errors.api.${code}`);
    }
  }
}

if (violations.length > 0) {
  console.error("check-api-error-translations: violations found:\n");
  for (const violation of violations) {
    console.error(`  - ${violation}`);
  }
  process.exit(1);
}

console.log(
  `check-api-error-translations: OK (${API_ERROR_CODES.length} codes × ${locales.length} locales)`,
);
