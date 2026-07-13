import type { SupportedLocale } from "#locale/supported-locale/types.js";
import type { ColorSchemePreference, TimeFormatPreference } from "../settings/types.js";

export interface UserSessionData {
  avatarUrl: string | null;
  colorScheme: ColorSchemePreference;
  displayName: string;
  language: SupportedLocale;
  onboardingCompletedAt: string | null;
  timeFormat: TimeFormatPreference;
  timezone: string;
}

export interface UserSessionResponse {
  data: UserSessionData;
  success: true;
}
