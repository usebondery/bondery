import "server-only";

import { cache } from "react";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import {
  EN_API_ERROR_FALLBACKS,
  getApiErrorFallbacksForLocale,
  type ApiErrorFallbackMessages,
} from "@/lib/i18n/getApiErrorFallbacks";

export const getApiErrorFallbacksOnServer = cache(
  async (): Promise<ApiErrorFallbackMessages> => {
    try {
      const { locale } = await resolveLocaleSettings();
      return getApiErrorFallbacksForLocale(locale);
    } catch {
      return EN_API_ERROR_FALLBACKS;
    }
  },
);
