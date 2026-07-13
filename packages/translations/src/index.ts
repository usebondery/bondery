/**
 * Bondery translations package — namespace-based i18n resources.
 */

import "./i18next-catalog-augment.js";

export {
  ALL_NAMESPACE_NAMES,
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  getNamespaceManifest,
  i18nConfig,
  manifest,
  type NamespaceEntry,
  namespaceFilePath,
  namespacesForPlatform,
  type Platform,
  preloadGroup,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type TranslationManifest,
} from "#config.js";
export type {
  BranchPrefixFor,
  Catalog,
  ExtensionNamespace,
  LooseTranslateFn,
  MobileNamespace,
  NamespaceKey,
  PrefixedKeys,
  TranslateFn,
  WebNamespace,
} from "#i18n-types.js";
export { loadNamespace, resourceLoader } from "#loader.js";
