import {
  DEFAULT_LOCALE,
  i18nConfig,
  loadNamespace,
  namespacesForPlatform,
  preloadGroup,
  SUPPORTED_LOCALES,
} from "@bondery/translations";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

function buildShellResources() {
  const shellNamespaces = preloadGroup("mobile.shell");
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((lng) => [
      lng,
      Object.fromEntries(
        shellNamespaces.map((namespace) => [namespace, loadNamespace(lng, namespace)]),
      ),
    ]),
  );
}

i18n.use(initReactI18next).init({
  defaultNS: i18nConfig.defaultNS,
  fallbackLng: i18nConfig.fallbackLng,
  interpolation: i18nConfig.interpolation,
  keySeparator: i18nConfig.keySeparator,
  lng: DEFAULT_LOCALE,
  ns: namespacesForPlatform("mobile"),
  nsSeparator: i18nConfig.nsSeparator,
  partialBundledLanguages: true,
  resources: buildShellResources(),
});

export async function preloadMobileNamespaces(groups: string[]) {
  const namespaces = [...new Set(groups.flatMap((group) => preloadGroup(group)))];
  await i18n.loadNamespaces(namespaces);
}

export default i18n;
