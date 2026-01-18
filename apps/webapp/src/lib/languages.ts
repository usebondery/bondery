/**
 * Supported languages configuration
 */

export interface LanguageData {
  value: string; // Language code (e.g., 'en', 'cs')
  label: string; // Display name
  flag: string; // ISO country code for flag
  nativeName: string; // Native language name
}

export const LANGUAGES_DATA: LanguageData[] = [
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
    nativeName: "Čeština",
  },
];
