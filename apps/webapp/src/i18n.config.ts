import type { I18nConfig } from "next-i18next/proxy";
import { i18nConfig, resourceLoader, SUPPORTED_LOCALES } from "@bondery/translations";

const config: I18nConfig = {
  supportedLngs: [...SUPPORTED_LOCALES],
  fallbackLng: i18nConfig.fallbackLng,
  defaultNS: i18nConfig.defaultNS,
  ns: [...i18nConfig.ns],
  localeInPath: false,
  resourceLoader,
  reloadOnPrerender: process.env.NODE_ENV === "development",
  i18nextOptions: {
    keySeparator: i18nConfig.keySeparator,
    nsSeparator: i18nConfig.nsSeparator,
    interpolation: i18nConfig.interpolation,
  },
};

export default config;
