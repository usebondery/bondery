import type { NamespaceKey, SupportedLocale } from "@bondery/translations";
import { namespacesForPlatform, preloadGroup } from "@bondery/translations";
import { getT } from "next-i18next/server";

async function loadNamespaces(
  locale: SupportedLocale,
  namespaces: NamespaceKey[],
): Promise<NamespaceKey[]> {
  await Promise.all(namespaces.map((namespace) => getT(namespace, { lng: locale })));
  return namespaces;
}

/**
 * Load the namespaces of the given preload groups into the server i18next
 * instance.
 *
 * @param locale The locale of the current request.
 * @param groups Manifest preload group names, such as `web.shell`.
 * @returns The deduplicated namespace list that this call loaded.
 */
export async function preloadWebNamespaces(
  locale: SupportedLocale,
  groups: string[],
): Promise<NamespaceKey[]> {
  const namespaces = [...new Set(groups.flatMap((group) => preloadGroup(group)))] as NamespaceKey[];
  return loadNamespaces(locale, namespaces);
}

/**
 * Load every web namespace into the server i18next instance.
 *
 * Use this for the authenticated shell. Its nested route layouts preload extra
 * namespaces, but only one `LocaleProvider` mounts, so that provider must ship
 * every namespace a child route can render.
 *
 * @param locale The locale of the current request.
 * @returns The web namespace list.
 */
export async function preloadAllWebNamespaces(locale: SupportedLocale): Promise<NamespaceKey[]> {
  return loadNamespaces(locale, namespacesForPlatform("web") as NamespaceKey[]);
}
