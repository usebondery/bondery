import {
  i18nConfig,
  namespacesForPlatform,
  resourceLoader,
  SUPPORTED_LOCALES,
} from "@bondery/translations";
import type { I18nConfig } from "next-i18next/proxy";

const config: I18nConfig = {
  defaultNS: i18nConfig.defaultNS,
  fallbackLng: i18nConfig.fallbackLng,
  i18nextOptions: {
    interpolation: i18nConfig.interpolation,
    keySeparator: i18nConfig.keySeparator,
    nsSeparator: i18nConfig.nsSeparator,
  },
  localeInPath: false,
  ns: namespacesForPlatform("web"),
  reloadOnPrerender: process.env.NODE_ENV === "development",
  resourceLoader,
  supportedLngs: [...SUPPORTED_LOCALES],
};

export default config;
