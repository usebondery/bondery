import {
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@bondery/schemas/locale/supported-locale";

/**
 * Parse Accept-Language (with optional q weights) and return the best supported locale.
 */
export function resolveLocaleFromAcceptLanguageHeader(acceptLanguage: string): SupportedLocale {
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code = "", priority] = lang.trim().split(";q=");
      return {
        code: code.split("-").at(0)?.toLowerCase() ?? "",
        priority: priority ? Number.parseFloat(priority) : 1,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  for (const { code } of languages) {
    if ((SUPPORTED_LOCALES as readonly string[]).includes(code)) {
      return coerceSupportedLocale(code);
    }
  }

  return DEFAULT_LOCALE;
}

export function resolveLocaleFromAcceptLanguage(headers: Headers): SupportedLocale {
  return resolveLocaleFromAcceptLanguageHeader(headers.get("accept-language") ?? "");
}

/**
 * Prefer an authenticated user's saved language; otherwise parse Accept-Language.
 */
export function resolveRequestLocale(
  headers: Headers,
  sessionLanguage?: SupportedLocale | null,
): SupportedLocale {
  if (sessionLanguage) {
    return sessionLanguage;
  }

  return resolveLocaleFromAcceptLanguage(headers);
}
