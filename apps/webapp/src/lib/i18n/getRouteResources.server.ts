import type { SupportedLocale } from "@bondery/translations";
import { DEFAULT_LOCALE } from "@bondery/translations";
import type { i18n, Resource } from "i18next";
import { getResources } from "next-i18next/server";

/**
 * Extract the route resources from the server i18next singleton.
 *
 * The singleton accumulates every namespace that any earlier request loaded.
 * Without filters, `getResources` serializes all of them for all 27 languages
 * into the HTML. This helper selects only the namespaces of the route preload
 * groups, and only for the active locale and the fallback locale.
 *
 * @param i18nInstance The shared server i18next instance.
 * @param locale The locale of the current request.
 * @param namespaces The namespaces of the route preload groups.
 * @returns Resources for `locale` and `DEFAULT_LOCALE`.
 */
export function getRouteResources(
  i18nInstance: i18n,
  locale: SupportedLocale,
  namespaces: string[],
): Resource {
  const languages = locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];
  return getResources(i18nInstance, namespaces, languages);
}
