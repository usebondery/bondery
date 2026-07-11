import "server-only";

import { getT } from "next-i18next/server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

/**
 * Server translation helper with explicit namespace.
 */
export async function getWebTranslations(namespace: string, keyPrefix?: string) {
  const { locale } = await resolveLocaleSettings();
  const { t } = await getT(namespace, {
    lng: locale,
    ...(keyPrefix ? { keyPrefix } : {}),
  });
  return t;
}

export async function getCommonTranslations(keyPrefix?: string) {
  return getWebTranslations("common", keyPrefix);
}
