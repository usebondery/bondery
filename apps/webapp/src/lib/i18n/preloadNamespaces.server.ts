import type { NamespaceKey, SupportedLocale } from "@bondery/translations";
import { preloadGroup } from "@bondery/translations";
import { getT } from "next-i18next/server";

export async function preloadWebNamespaces(locale: SupportedLocale, groups: string[]) {
  const namespaces = [...new Set(groups.flatMap((group) => preloadGroup(group)))] as NamespaceKey[];
  await Promise.all(namespaces.map((namespace) => getT(namespace, { lng: locale })));
}
