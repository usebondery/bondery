import { coerceSupportedLocale, DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import { ALL_NAMESPACE_NAMES } from "#manifest.js";

export {
  ALL_NAMESPACE_NAMES,
  DEFAULT_LOCALE,
  getNamespaceManifest,
  manifest,
  type NamespaceEntry,
  namespaceFilePath,
  namespacesForPlatform,
  type Platform,
  preloadGroup,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TranslationManifest,
} from "#manifest.js";

export { coerceSupportedLocale };

export const i18nConfig = {
  defaultNS: "common" as const,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
    prefix: "{",
    suffix: "}",
  },
  keySeparator: ".",
  ns: ALL_NAMESPACE_NAMES,
  nsSeparator: ":",
} as const;
