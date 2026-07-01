/**
 * Bondery translations package
 *
 * Exports translation files for internationalization
 */

export const SUPPORTED_LOCALES = ["en", "cs"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Re-export translations
import enTranslations from "./en.json" with { type: "json" };
import csTranslations from "./cs.json" with { type: "json" };

export { enTranslations as en, csTranslations as cs };

export { i18nConfig, loadTranslation, resourceLoader } from "#i18n.js";
