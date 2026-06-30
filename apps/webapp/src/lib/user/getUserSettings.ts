import { cache } from "react";
import { serverApiFetch } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ColorSchemePreference } from "@bondery/schemas";
import { SUPPORTED_LOCALES } from "@bondery/translations";
import type { SupportedLocale } from "@bondery/translations";

export interface UserSettingsData {
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  locale: SupportedLocale;
  timezone: string;
  timeFormat: "24h" | "12h";
  colorScheme: ColorSchemePreference;
  onboardingCompletedAt: string | null;
  aiMessagesUsed: number;
}

const DEFAULT_SETTINGS: UserSettingsData = {
  userName: "User",
  userEmail: "",
  avatarUrl: null,
  locale: "en",
  timezone: "UTC",
  timeFormat: "24h",
  colorScheme: "auto",
  onboardingCompletedAt: null,
  aiMessagesUsed: 0,
};

/**
 * Fetches user settings from the internal API.
 *
 * Wrapped in React cache() so it executes at most once per server render,
 * regardless of how many layouts or utilities call it during the same request.
 *
 * Falls back to safe defaults if the API is unreachable or returns an error.
 */
export const getUserSettings = cache(async (): Promise<UserSettingsData> => {
  try {
    const response = await serverApiFetch(API_ROUTES.ME_SETTINGS, undefined, {
      cache: "no-store",
    });

    if (response.status === 401) {
      console.error("[getUserSettings] Unauthorized (401) — returning default settings");
      return DEFAULT_SETTINGS;
    }

    if (response.ok) {
      const result = await response.json();
      const settings = result?.data || {};

      const colorScheme: ColorSchemePreference =
        settings.colorScheme === "light" ||
        settings.colorScheme === "dark" ||
        settings.colorScheme === "auto"
          ? settings.colorScheme
          : "auto";

      // Validate locale against supported locales; fall back to "en" for unknown values.
      const rawLocale: string = settings.language ?? "en";
      const locale: SupportedLocale = (SUPPORTED_LOCALES as readonly string[]).includes(rawLocale)
        ? (rawLocale as SupportedLocale)
        : "en";

      return {
        userName: settings.name || settings.email || "User",
        userEmail: settings.email || "",
        avatarUrl: settings.avatarUrl || null,
        locale,
        timezone: settings.timezone || "UTC",
        timeFormat: settings.timeFormat === "12h" ? "12h" : "24h",
        colorScheme,
        onboardingCompletedAt: settings.onboardingCompletedAt ?? null,
        aiMessagesUsed: settings.aiMessagesUsed ?? 0,
      };
    }
  } catch (error) {
    console.error("[getUserSettings] Failed to fetch user settings:", error);
  }

  return DEFAULT_SETTINGS;
});
