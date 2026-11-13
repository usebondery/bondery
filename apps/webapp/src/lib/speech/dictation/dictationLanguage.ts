import { intlTagForLocale, type SupportedLocale } from "@bondery/translations";

/**
 * Fallback when a locale has no tag. English is the one language every
 * recognizer offers.
 */
export const DICTATION_FALLBACK_LANGUAGE_TAG = "en-US";

/**
 * Maps the UI locale onto the recognition language tag.
 *
 * The region comes from `supported-locales.json`. A bare `pt` would aim the
 * recognizer at Brazilian Portuguese. An unknown cookie value falls back to
 * English so a stale locale cannot break the session.
 */
export function dictationLanguageTag(locale: SupportedLocale): string {
  const tag = intlTagForLocale(locale);
  if (!tag.startsWith(locale) || !tag.includes("-")) {
    return DICTATION_FALLBACK_LANGUAGE_TAG;
  }
  return tag;
}
