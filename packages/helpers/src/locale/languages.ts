import { SUPPORTED_LOCALES } from "@bondery/translations";

export interface LanguageData {
  value: string;
  label: string;
  flag: string;
  nativeName: string;
}

/**
 * App-supported languages for user settings (web + mobile).
 * Values are kept in sync with @bondery/translations SUPPORTED_LOCALES.
 */
export const APP_LANGUAGES_DATA: LanguageData[] = [
  {
    value: "en",
    label: "English",
    flag: "gb",
    nativeName: "English",
  },
  {
    value: "cs",
    label: "Czech",
    flag: "cz",
    nativeName: "čeština",
  },
];

/** Runtime guard: every supported locale must have picker metadata. */
const appLanguageValues = new Set(APP_LANGUAGES_DATA.map((language) => language.value));
for (const locale of SUPPORTED_LOCALES) {
  if (!appLanguageValues.has(locale)) {
    throw new Error(`Missing APP_LANGUAGES_DATA entry for supported locale: ${locale}`);
  }
}

export function getAppLanguageByValue(value: string): LanguageData | undefined {
  return APP_LANGUAGES_DATA.find((language) => language.value === value);
}

/** Translation key for a localized app-language exonym, e.g. `Languages.en`. */
export function getAppLanguageExonymTranslationKey(languageCode: string): string {
  return `Languages.${languageCode}`;
}

/** Picker label: localized exonym plus invariant native endonym. */
export function formatLanguageDisplayLabel(localizedLabel: string, nativeName: string): string {
  return `${localizedLabel} (${nativeName})`;
}
