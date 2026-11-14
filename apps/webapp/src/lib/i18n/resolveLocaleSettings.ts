import "server-only";

import type { DateFormatPreference } from "@bondery/schemas";
import { coerceDateFormatPreference } from "@bondery/schemas/locale";
import type { SupportedLocale } from "@bondery/translations";
import { DEFAULT_LOCALE } from "@bondery/translations";
import { cache } from "react";
import { getRequestSession } from "@/lib/auth/getRequestSession";
import { fetchBetterAuthSession } from "@/lib/auth/server";
import { getLocaleFromHeaders } from "./getLocaleFromHeaders";

export interface LocaleSettings {
  dateFormat: DateFormatPreference;
  locale: SupportedLocale;
  timeFormat: "24h" | "12h";
  timezone: string;
}

const FALLBACK: LocaleSettings = {
  dateFormat: "locale",
  locale: DEFAULT_LOCALE,
  timeFormat: "24h",
  timezone: "UTC",
};

/**
 * Resolves locale settings for the current request.
 *
 * Strategy:
 * - If no session: derive locale from the browser's Accept-Language header,
 *   use UTC / 24h defaults (locale is cosmetic on unauthenticated routes).
 * - If session exists: use the user's saved session from getRequestSession(),
 *   which is cache()-deduplicated so the API call runs at most once per render.
 *
 * IMPORTANT: this function uses getSession() (cookie read, no network) to check
 * auth status. It is NOT an auth guard — never use it for access control.
 * Auth guards must use resolveServerSession() which reads the encrypted BFF session.
 */
export const resolveLocaleSettings = cache(async (): Promise<LocaleSettings> => {
  try {
    const session = await fetchBetterAuthSession();

    if (!session) {
      const locale = await getLocaleFromHeaders();
      return { dateFormat: "locale", locale, timeFormat: "24h", timezone: "UTC" };
    }

    const requestSession = await getRequestSession();
    if (requestSession.kind !== "authenticated" || !requestSession.shell) {
      return FALLBACK;
    }

    return {
      dateFormat: coerceDateFormatPreference(requestSession.shell.dateFormat),
      locale: requestSession.shell.locale,
      timeFormat: requestSession.shell.timeFormat,
      timezone: requestSession.shell.timezone,
    };
  } catch {
    return FALLBACK;
  }
});
