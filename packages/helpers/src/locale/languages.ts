import {
  APP_LOCALE_METADATA,
  type AppLocaleMetadata,
  type SupportedLocale,
} from "@bondery/schemas/locale/supported-locale";

/** App UI locale picker row — exonyms come from the `Languages` translation namespace. */
export interface AppLanguageData {
  flag: string;
  nativeName: string;
  value: SupportedLocale;
}

/** World / contact language rows include a fixed English label for search and display. */
export interface LanguageData {
  flag: string;
  label: string;
  nativeName: string;
  value: string;
}

function toAppLanguageData(entry: AppLocaleMetadata): AppLanguageData {
  return {
    flag: entry.flag,
    nativeName: entry.nativeName,
    value: entry.code as SupportedLocale,
  };
}

/** App-supported languages for user settings (web + mobile). Derived from supported-locales.json. */
export const APP_LANGUAGES_DATA: AppLanguageData[] = APP_LOCALE_METADATA.map(toAppLanguageData);

export function getAppLanguageByValue(value: string): AppLanguageData | undefined {
  return APP_LANGUAGES_DATA.find((language) => language.value === value);
}

/** Key within the `Languages` namespace — use with `useWebTranslations("Languages")` / `useMobileTranslations("Languages")`. */
export function getAppLanguageExonymKey(languageCode: string): string {
  return languageCode;
}

export type AppLanguageExonymTranslator = (exonymKey: string) => string;

/** Localized exonym for an app UI locale from the `Languages` namespace. */
export function resolveAppLanguageExonym(
  translate: AppLanguageExonymTranslator,
  language: AppLanguageData,
): string {
  return translate(getAppLanguageExonymKey(language.value));
}

/** Picker row label for app UI locales: localized exonym plus invariant native endonym. */
export function formatAppLanguagePickerLabel(
  translate: AppLanguageExonymTranslator,
  language: AppLanguageData,
): string {
  return formatLanguageDisplayLabel(
    resolveAppLanguageExonym(translate, language),
    language.nativeName,
  );
}

/** Picker label: localized exonym plus invariant native endonym. */
export function formatLanguageDisplayLabel(localizedExonym: string, nativeName: string): string {
  return `${localizedExonym} (${nativeName})`;
}
