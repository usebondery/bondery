/**
 * Fail CI when catalog codes are missing from common.errors.api in en/cs/de.
 *
 * Usage: node scripts/check/check-api-errors-translations.mjs (pnpm run check:api-errors:translations)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { API_ERROR_CODES } from "@bondery/schemas/errors";
import localeCatalog from "@bondery/schemas/locale/supported-locales.json" with { type: "json" };

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-api-errors-translations");

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesRoot = join(__dirname, "..", "..", "packages", "translations", "src", "locales");
const locales = localeCatalog.supported.map((entry) => entry.code);

for (const locale of locales) {
  const common = JSON.parse(readFileSync(join(localesRoot, locale, "common.json"), "utf8"));
  const apiErrors = common.errors?.api ?? {};

  for (const code of API_ERROR_CODES) {
    const value = apiErrors[code];
    if (typeof value !== "string" || value.trim().length === 0) {
      check.add(`${locale}: missing common.errors.api.${code}`);
    }
  }
}

check.ok(`${API_ERROR_CODES.length} codes × ${locales.length} locales`);
