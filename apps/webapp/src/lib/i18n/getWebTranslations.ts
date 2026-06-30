import { getT } from "next-i18next/server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

/**
 * Server translation helper — API-compatible with the former next-intl getTranslations.
 */
export async function getWebTranslations(keyPrefix?: string) {
  const { locale } = await resolveLocaleSettings();
  const { t } = await getT(undefined, {
    lng: locale,
    ...(keyPrefix ? { keyPrefix } : {}),
  });
  return t;
}
