"use client";

import type { SupportedLocale } from "@bondery/translations";
import { useChangeLanguage } from "next-i18next/client";
import { useUserLocale } from "@/components/shell/UserLocaleProvider";

/**
 * Applies a user language change across client i18n, locale context, and RSC.
 * Call after the language has been persisted to the API.
 */
export function useApplyUserLanguage() {
  const changeLanguage = useChangeLanguage();
  const { applyUserLocale } = useUserLocale();

  return async (locale: SupportedLocale) => {
    applyUserLocale({ locale });
    await changeLanguage(locale);
  };
}
