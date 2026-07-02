import { cache } from "react";
import { getAppBootstrap } from "@/lib/app/getAppBootstrap";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLocaleFromHeaders } from "./getLocaleFromHeaders";
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
      return { locale, timezone: "UTC", timeFormat: "24h" };
    }

    const bootstrap = await getAppBootstrap();
    if (bootstrap.status !== "ok") {
      return FALLBACK;
    }

    return {
      locale: bootstrap.settings.locale,
      timezone: bootstrap.settings.timezone,
      timeFormat: bootstrap.settings.timeFormat,
    };
  } catch {
    return FALLBACK;
  }
});
