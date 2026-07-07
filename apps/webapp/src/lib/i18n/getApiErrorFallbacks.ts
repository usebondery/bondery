import i18next from "i18next";
import { loadTranslation } from "@bondery/translations/i18n";
import type { SupportedLocale } from "@bondery/translations";

export interface ApiErrorFallbackMessages {
  unavailable: string;
  serverError: string;
  requestFailed: string;
}

export const EN_API_ERROR_FALLBACKS: ApiErrorFallbackMessages = {
  unavailable: "The API is temporarily unavailable. Please try again.",
  serverError: "Something went wrong on the server. Please try again.",
  requestFailed: "Request failed. Please try again.",
};

export function getApiErrorFallbacksForLocale(locale: SupportedLocale): ApiErrorFallbackMessages {
  const translations = loadTranslation(locale);
  const common = translations.WebAppCommon as Record<string, string>;

  return {
    unavailable: common.ApiTemporarilyUnavailable ?? EN_API_ERROR_FALLBACKS.unavailable,
    serverError: common.ServerErrorGeneric ?? EN_API_ERROR_FALLBACKS.serverError,
    requestFailed: common.RequestFailedGeneric ?? EN_API_ERROR_FALLBACKS.requestFailed,
  };
}

function fromI18next(): ApiErrorFallbackMessages | null {
  if (typeof window === "undefined" || !i18next.isInitialized) {
    return null;
  }

  return {
    unavailable: i18next.t("WebAppCommon.ApiTemporarilyUnavailable"),
    serverError: i18next.t("WebAppCommon.ServerErrorGeneric"),
    requestFailed: i18next.t("WebAppCommon.RequestFailedGeneric"),
  };
}

/** Client-safe: uses i18next when initialized, otherwise English fallbacks. */
export async function getApiErrorFallbacksForClient(): Promise<ApiErrorFallbackMessages> {
  return fromI18next() ?? EN_API_ERROR_FALLBACKS;
}
