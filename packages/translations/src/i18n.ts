import csTranslations from "./cs.json" with { type: "json" };
import enTranslations from "./en.json" with { type: "json" };

export const i18nConfig = {
  fallbackLng: "en" as const,
  defaultNS: "translation",
  ns: ["translation"] as const,
  keySeparator: ".",
  nsSeparator: ":",
  interpolation: {
    escapeValue: false,
    prefix: "{",
    suffix: "}",
  },
};

export function loadTranslation(lng: "en" | "cs") {
  return lng === "cs" ? csTranslations : enTranslations;
}

/** For next-i18next resourceLoader (Vercel-safe bundling). */
export function resourceLoader(language: string, namespace: string) {
  if (namespace !== i18nConfig.defaultNS) {
    return Promise.resolve({});
  }
  const lng = language === "cs" ? "cs" : "en";
  return Promise.resolve(loadTranslation(lng));
}
