import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ColorSchemePreference, UserSettingsResponse } from "@bondery/schemas";
import type { SupportedLocale } from "@bondery/translations";
import { coerceSupportedLocale } from "@bondery/translations";
import { firstNonEmpty, nonEmpty } from "@/lib/shared/nonEmpty";

export const SETTINGS_API_PATH = API_ROUTES.ME_SETTINGS;

export type SettingsQueryResult = { data?: UserSettingsResponse["data"] };

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
  return { data: raw.data };
}

/** Normalize settings for layout routing (onboarding, shell, locale). */
export function parseUserSettingsData(
  settings: Partial<UserSettingsResponse["data"]>,
): UserSettingsData {
  const colorScheme: ColorSchemePreference =
    settings.colorScheme === "light" ||
    settings.colorScheme === "dark" ||
    settings.colorScheme === "auto"
      ? settings.colorScheme
      : "auto";

  const locale = coerceSupportedLocale(settings.language);

  return {
    aiMessagesUsed: settings.aiMessagesUsed ?? 0,
    avatarUrl: settings.avatarUrl ?? null,
    colorScheme,
    locale,
    onboardingCompletedAt: settings.onboardingCompletedAt ?? null,
    timeFormat: settings.timeFormat === "12h" ? "12h" : "24h",
    timezone: nonEmpty(settings.timezone) ?? "UTC",
    userEmail: settings.email ?? "",
    userName: firstNonEmpty(settings.name, settings.email) ?? "User",
  };
}
