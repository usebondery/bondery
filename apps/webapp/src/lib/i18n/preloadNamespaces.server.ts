import type { SupportedLocale } from "@bondery/translations";
import { preloadGroup } from "@bondery/translations";
import { getT, initServerI18next } from "next-i18next/server";
import i18nConfig from "@/i18n.config";

export async function preloadWebNamespaces(locale: SupportedLocale, groups: string[]) {
  const namespaces = [...new Set(groups.flatMap((group) => preloadGroup(group)))];
  await initServerI18next(i18nConfig, namespaces);
  await Promise.all(namespaces.map((namespace) => getT(namespace, { lng: locale })));
}
