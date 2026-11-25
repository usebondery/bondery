"use client";

import type { SupportedLocale } from "@bondery/translations";
import { useChangeLanguage } from "next-i18next/client";
import { useUserLocale } from "@/components/shell/localeProvider";

/**
 * Applies a user language change across client i18n, locale context, and RSC.
 * Call after the language has been persisted to the API.
 *
 * The cookie write runs first. `applyUserLocale` then reloads the page, so the
 * server render of the new language starts with the new language cookie.
 */
export function useApplyUserLanguage() {
  const changeLanguage = useChangeLanguage();
  const { applyUserLocale } = useUserLocale();

  return async (locale: SupportedLocale) => {
    await changeLanguage(locale);
    applyUserLocale({ locale });
  };
}
