import { DEFAULT_LOCALE, type SupportedLocale } from "@bondery/translations";
import { cache } from "react";
import { getAppBootstrap } from "@/lib/app/getAppBootstrap";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLocaleFromHeaders } from "./getLocaleFromHeaders";

export interface LocaleSettings {
  locale: SupportedLocale;
  timeFormat: "24h" | "12h";
  timezone: string;
}

const FALLBACK: LocaleSettings = {
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
 * - If session exists: use the user's saved settings from getAppBootstrap(),
 *   which is cache()-deduplicated so the API call runs at most once per render.
 *
 * IMPORTANT: this function uses getSession() (cookie read, no network) to check
 * auth status. It is NOT an auth guard — never use it for access control.
 * Auth guards must use resolveServerSession() which verifies with Supabase.
 */
export const resolveLocaleSettings = cache(async (): Promise<LocaleSettings> => {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const locale = await getLocaleFromHeaders();
      return { locale, timeFormat: "24h", timezone: "UTC" };
    }

    const bootstrap = await getAppBootstrap();
    if (bootstrap.status !== "ok") {
      return FALLBACK;
    }

    return {
      locale: bootstrap.settings.locale,
      timeFormat: bootstrap.settings.timeFormat,
      timezone: bootstrap.settings.timezone,
    };
  } catch {
    return FALLBACK;
  }
});
