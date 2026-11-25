import { DEFAULT_LOCALE, type SupportedLocale } from "@bondery/schemas/locale/supported-locale";
import { ALL_NAMESPACE_NAMES } from "#manifest.js";

export {
  ALL_NAMESPACE_NAMES,
  DEFAULT_LOCALE,
  getNamespaceManifest,
  intlTagForLocale,
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

export type I18nConfig = {
  readonly defaultNS: "common";
  readonly fallbackLng: SupportedLocale;
  readonly interpolation: {
    readonly escapeValue: false;
    readonly prefix: "{";
    readonly suffix: "}";
  };
  readonly keySeparator: ".";
  readonly ns: readonly string[];
  readonly nsSeparator: ":";
};

export const i18nConfig: I18nConfig = {
  defaultNS: "common",
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
    prefix: "{",
    suffix: "}",
  },
  keySeparator: ".",
  ns: ALL_NAMESPACE_NAMES,
  nsSeparator: ":",
};

export { coerceSupportedLocale } from "@bondery/schemas/locale/supported-locale";
