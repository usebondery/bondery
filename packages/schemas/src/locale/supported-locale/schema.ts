import { z } from "zod";
import localeCatalog from "../../../locale/supported-locales.json" with { type: "json" };
import type { AppLocaleMetadata, SupportedLocale } from "./types.js";

/**
 * Postgres `public` enum name for `user_settings.language`.
 * Keep migration enum labels in sync with `supported` codes below; then run
 * `npm run gen-types` in `apps/supabase-db`.
 */
export const SUPPORTED_LOCALE_POSTGRES_ENUM = localeCatalog.postgresEnum;
export const APP_LOCALE_METADATA = localeCatalog.supported as readonly AppLocaleMetadata[];

const rawLocaleCodes = APP_LOCALE_METADATA.map((entry) => entry.code);
if (rawLocaleCodes.length === 0) {
  throw new Error("supported-locales.json must define at least one supported locale");
}

const localeCodes = rawLocaleCodes as [string, ...string[]];

/** Bondery UI locales with shipped translation namespaces. */
export const supportedLocaleSchema: z.ZodType<SupportedLocale> = z.enum(localeCodes);

export const SUPPORTED_LOCALES = rawLocaleCodes as readonly SupportedLocale[];

/** Default / fallback locale when preference is missing or invalid. */
export const DEFAULT_LOCALE = localeCatalog.default as SupportedLocale;

if (!SUPPORTED_LOCALES.includes(DEFAULT_LOCALE)) {
  throw new Error(`supported-locales.json default "${DEFAULT_LOCALE}" is not in supported list`);
}

if (!SUPPORTED_LOCALE_POSTGRES_ENUM) {
  throw new Error("supported-locales.json must define postgresEnum for user_settings.language");
}

export function coerceSupportedLocale(raw: string | null | undefined): SupportedLocale {
  const normalized = (raw ?? DEFAULT_LOCALE).toLowerCase().split("-")[0];
  const parsed = supportedLocaleSchema.safeParse(normalized);
  return parsed.success ? parsed.data : DEFAULT_LOCALE;
}
