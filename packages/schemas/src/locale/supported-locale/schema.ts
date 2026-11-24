import { z } from "zod";
import localeCatalog from "../../../locale/supported-locales.json" with { type: "json" };
import type { AppLocaleMetadata, SupportedLocale } from "./types.js";

/**
 * Postgres `public` enum name for `user_settings.language`.
 * Keep migration enum labels in sync with `supported` codes below; then run
 * Run `pnpm run db:generate` in packages/db after schema changes.
 */
const SUPPORTED_LOCALE_POSTGRES_ENUM = localeCatalog.postgresEnum;
const APP_LOCALE_METADATA = localeCatalog.supported as readonly AppLocaleMetadata[];

const rawLocaleCodes = APP_LOCALE_METADATA.map((entry) => entry.code);
if (rawLocaleCodes.length === 0) {
  throw new Error("supported-locales.json must define at least one supported locale");
}

const localeCodes = rawLocaleCodes as [string, ...string[]];

/** Bondery UI locales with shipped translation namespaces. */
const supportedLocaleSchema: z.ZodType<SupportedLocale> = z
  .enum(localeCodes)
  .describe("Bondery UI locale code");

const SUPPORTED_LOCALES = rawLocaleCodes as readonly SupportedLocale[];

/** Default / fallback locale when preference is missing or invalid. */
const DEFAULT_LOCALE = localeCatalog.default as SupportedLocale;

if (!SUPPORTED_LOCALES.includes(DEFAULT_LOCALE)) {
  throw new Error(`supported-locales.json default "${DEFAULT_LOCALE}" is not in supported list`);
}

if (!SUPPORTED_LOCALE_POSTGRES_ENUM) {
  throw new Error("supported-locales.json must define postgresEnum for user_settings.language");
}

const intlTagByCode = new Map(APP_LOCALE_METADATA.map((entry) => [entry.code, entry.intl]));

const dirByCode = new Map(
  APP_LOCALE_METADATA.map((entry) => [entry.code, entry.dir ?? ("ltr" as const)]),
);

export function coerceSupportedLocale(raw: string | null | undefined): SupportedLocale {
  const [normalized] = (raw ?? DEFAULT_LOCALE).toLowerCase().split("-");
  const parsed = supportedLocaleSchema.safeParse(normalized);
  return parsed.success ? parsed.data : DEFAULT_LOCALE;
}

export {
  APP_LOCALE_METADATA,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALE_POSTGRES_ENUM,
  SUPPORTED_LOCALES,
  supportedLocaleSchema,
};

/**
 * Region tag for Intl, speech, and email dates.
 * A bare language code is not enough: `pt` resolves toward Brazilian Portuguese.
 */
export function intlTagForLocale(locale: string | null | undefined): string {
  const code = (locale ?? DEFAULT_LOCALE).toLowerCase().split("-")[0] ?? DEFAULT_LOCALE;
  return intlTagByCode.get(code) ?? intlTagByCode.get(DEFAULT_LOCALE) ?? "en-US";
}

/** Document direction for a catalog locale. Unknown codes return `ltr`. */
export function dirForLocale(locale: string | null | undefined): "ltr" | "rtl" {
  const code = (locale ?? DEFAULT_LOCALE).toLowerCase().split("-")[0] ?? DEFAULT_LOCALE;
  return dirByCode.get(code) ?? "ltr";
}
