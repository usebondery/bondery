import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ColorSchemePreference } from "@bondery/schemas";
import type { SupportedLocale } from "@bondery/translations";
import { coerceSupportedLocale } from "@bondery/translations";

export const SETTINGS_API_PATH = API_ROUTES.ME_SETTINGS;

export type SettingsQueryResult = { data?: Record<string, unknown> };

export interface UserSettingsData {
  aiMessagesUsed: number;
  avatarUrl: string | null;
  colorScheme: ColorSchemePreference;
  locale: SupportedLocale;
  onboardingCompletedAt: string | null;
  timeFormat: "24h" | "12h";
  timezone: string;
  userEmail: string;
  userName: string;
}

/** Normalize raw API `data` object for TanStack Query cache (`settingsKeys.me`). */
export function parseSettingsQueryResult(raw: SettingsQueryResult): SettingsQueryResult {
  const data = raw.data ?? {};
  return { data };
}

/** Normalize settings for layout routing (onboarding, shell, locale). */
export function parseUserSettingsData(settings: Record<string, unknown>): UserSettingsData {
  const colorScheme: ColorSchemePreference =
    settings.colorScheme === "light" ||
    settings.colorScheme === "dark" ||
    settings.colorScheme === "auto"
      ? settings.colorScheme
      : "auto";

  const locale = coerceSupportedLocale(settings.language as string | undefined);

  return {
    aiMessagesUsed: (settings.aiMessagesUsed as number | undefined) ?? 0,
    avatarUrl: (settings.avatarUrl as string | null | undefined) ?? null,
    colorScheme,
    locale,
    onboardingCompletedAt: (settings.onboardingCompletedAt as string | null | undefined) ?? null,
    timeFormat: settings.timeFormat === "12h" ? "12h" : "24h",
    timezone: (settings.timezone as string | undefined) || "UTC",
    userEmail: (settings.email as string | undefined) || "",
    userName:
      (settings.name as string | undefined) || (settings.email as string | undefined) || "User",
  };
}
