import {
  DEFAULT_LOCALE,
  i18nConfig,
  loadNamespace,
  namespacesForPlatform,
  SUPPORTED_LOCALES,
} from "@bondery/translations";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";

function resolveI18nInstance() {
  const candidate = i18next as typeof i18next & { default?: typeof i18next };
  if (typeof candidate.use === "function") {
    return candidate;
  }
  if (candidate.default && typeof candidate.default.use === "function") {
    return candidate.default;
  }
  return candidate;
}

const i18n = resolveI18nInstance();

function buildMobileResources() {
  const namespaces = namespacesForPlatform("mobile");
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((lng) => [
      lng,
      Object.fromEntries(namespaces.map((namespace) => [namespace, loadNamespace(lng, namespace)])),
    ]),
  );
}

if (!i18n.isInitialized && typeof i18n.use === "function" && initReactI18next) {
  i18n.use(initReactI18next).init({
    defaultNS: i18nConfig.defaultNS,
    fallbackLng: i18nConfig.fallbackLng,
    interpolation: i18nConfig.interpolation,
    keySeparator: i18nConfig.keySeparator,
    lng: DEFAULT_LOCALE,
    load: "languageOnly",
    ns: namespacesForPlatform("mobile"),
    nsSeparator: i18nConfig.nsSeparator,
    react: {
      useSuspense: false,
    },
    resources: buildMobileResources(),
    supportedLngs: [...SUPPORTED_LOCALES],
  });
}

export default i18n;
