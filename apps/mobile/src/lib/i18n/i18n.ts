import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en, cs } from "@bondery/translations";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    cs: { translation: cs },
  },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "translation",
  keySeparator: ".",
  nsSeparator: ":",
  interpolation: {
    escapeValue: false,
    prefix: "{",
    suffix: "}",
  },
});

export default i18n;
