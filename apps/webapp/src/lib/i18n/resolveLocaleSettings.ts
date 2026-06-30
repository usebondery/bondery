import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLocaleFromHeaders } from "./getLocaleFromHeaders";
import { getUserSettings } from "@/lib/user/getUserSettings";
import type { SupportedLocale } from "@bondery/translations";

export interface LocaleSettings {
  locale: SupportedLocale;
  timezone: string;
  timeFormat: "24h" | "12h";
}

const FALLBACK: LocaleSettings = {
  locale: "en",
  timezone: "UTC",
  timeFormat: "24h",
};

/**
 * Resolves locale settings for the current request.
 *
 * Strategy:
 * - If no session: derive locale from the browser's Accept-Language header,
 *   use UTC / 24h defaults (locale is cosmetic on unauthenticated routes).
 * - If session exists: use the user's saved settings (locale, timezone, timeFormat)
 *   fetched via getUserSettings(), which is cache()-deduplicated so the API
 *   call runs at most once per render even when multiple layouts call this.
 *
 * IMPORTANT: this function uses getSession() (cookie read, no network) to check
 * auth status. It is NOT an auth guard — never use it for access control.
 * Auth guards must use getUser() which verifies with the Supabase server.
 *
 * Falls back to hardcoded defaults ("en", UTC, 24h) if anything throws.
 */
export const resolveLocaleSettings = cache(async (): Promise<LocaleSettings> => {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const locale = await getLocaleFromHeaders();
      return { locale, timezone: "UTC", timeFormat: "24h" };
    }

    const settings = await getUserSettings();
    return {
      locale: settings.locale,
      timezone: settings.timezone,
      timeFormat: settings.timeFormat,
    };
  } catch {
    return FALLBACK;
  }
});
