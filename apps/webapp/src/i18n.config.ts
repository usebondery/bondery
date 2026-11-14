import { i18nConfig, namespacesForPlatform, SUPPORTED_LOCALES } from "@bondery/translations";
import type { I18nConfig } from "next-i18next/proxy";
import { diskResourceLoader } from "@/lib/i18n/diskResourceLoader.server";

/**
 * Load one namespace from the compiled resource map.
 *
 * The import is dynamic so `next dev` never compiles the 2,025 locale JSON
 * modules. Dev reads the JSON from disk. Production needs this bundle.
 */
async function bundledResourceLoader(
  language: string,
  namespace: string,
): Promise<Record<string, unknown>> {
  const { resourceLoader } = await import("@bondery/translations/loader");
  return resourceLoader(language, namespace);
}

const isDevelopment = process.env.NODE_ENV === "development";

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
  reloadOnPrerender: isDevelopment,
  resourceLoader: isDevelopment ? diskResourceLoader : bundledResourceLoader,
  supportedLngs: [...SUPPORTED_LOCALES],
};

export default config;
