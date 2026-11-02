import type { SupportedLocale } from "@bondery/translations";

/**
 * Fallback when a locale has no tag. English is the one language every
 * recognizer offers.
 */
export const DICTATION_FALLBACK_LANGUAGE_TAG = "en-US";

/**
 * Recognition tag per UI locale.
 *
 * The region matters, because a bare `en` leaves the recognizer to guess a
 * variant. A wrong variant lowers accuracy but never breaks the session.
 *
 * The map is partial on purpose. The test asserts one entry per supported
 * locale, so a new locale fails the build instead of speaking English.
 */
const LANGUAGE_TAG_BY_LOCALE: Partial<Record<SupportedLocale, string>> = {
  cs: "cs-CZ",
  de: "de-DE",
  en: "en-US",
};

/**
 * Maps the UI locale onto the recognition language tag.
 *
 * An unknown locale falls back to English. The locale arrives from a cookie, so
 * a stale value must not break the session.
 */
export function dictationLanguageTag(locale: SupportedLocale): string {
  return LANGUAGE_TAG_BY_LOCALE[locale] ?? DICTATION_FALLBACK_LANGUAGE_TAG;
}
