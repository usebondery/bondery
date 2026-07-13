import {
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  i18nConfig,
  loadNamespace,
  namespacesForPlatform,
  preloadGroup,
  SUPPORTED_LOCALES,
} from "@bondery/translations";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

function resolveExtensionLocale(): string {
  try {
    const uiLanguage = chrome.i18n.getUILanguage();
    return coerceSupportedLocale(uiLanguage.split("-")[0] ?? DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}

function buildShellResources() {
  const shellNamespaces = preloadGroup("extension.shell");
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((lng) => [
      lng,
      Object.fromEntries(
        shellNamespaces.map((namespace) => [namespace, loadNamespace(lng, namespace)]),
      ),
    ]),
  );
}

const locale = resolveExtensionLocale();

void i18n.use(initReactI18next).init({
  defaultNS: i18nConfig.defaultNS,
  fallbackLng: i18nConfig.fallbackLng,
  interpolation: i18nConfig.interpolation,
  keySeparator: i18nConfig.keySeparator,
  lng: locale,
  ns: namespacesForPlatform("extension"),
  nsSeparator: i18nConfig.nsSeparator,
  partialBundledLanguages: true,
  resources: buildShellResources(),
});

export async function preloadExtensionNamespaces(groups: string[]) {
  const namespaces = [...new Set(groups.flatMap((group) => preloadGroup(group)))];
  await i18n.loadNamespaces(namespaces);
}

export default i18n;
