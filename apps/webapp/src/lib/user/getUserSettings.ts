import { cache } from "react";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { API_URL } from "@/lib/config";
import type { ColorSchemePreference } from "@bondery/types";
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}${API_ROUTES.ME_SETTINGS}`, {
      next: { tags: ["settings"] },
      headers,
    });

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
