import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { cs, i18nConfig, loadTranslation, SUPPORTED_LOCALES } from "@bondery/translations";

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    SUPPORTED_LOCALES.map((lng) => [lng, { translation: loadTranslation(lng) }]),
  ),
  lng: "en",
  fallbackLng: i18nConfig.fallbackLng,
  defaultNS: i18nConfig.defaultNS,
  keySeparator: i18nConfig.keySeparator,
  nsSeparator: i18nConfig.nsSeparator,
  interpolation: i18nConfig.interpolation,
});

export default i18n;
