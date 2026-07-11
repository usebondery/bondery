import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ColorSchemePreference, UserSessionResponse } from "@bondery/schemas";
import type { SupportedLocale } from "@bondery/translations";
import { coerceSupportedLocale } from "@bondery/translations";

export const ME_SESSION_API_PATH = API_ROUTES.ME_SESSION;

export interface MeSessionData {
  avatarUrl: string | null;
  colorScheme: ColorSchemePreference;
  displayName: string;
  locale: SupportedLocale;
  onboardingCompletedAt: string | null;
  timeFormat: "12h" | "24h";
  timezone: string;
}

export function parseMeSession(raw: UserSessionResponse): MeSessionData {
  const data = raw.data;
  return {
    avatarUrl: data.avatarUrl ?? null,
    colorScheme:
      data.colorScheme === "light" || data.colorScheme === "dark" || data.colorScheme === "auto"
        ? data.colorScheme
        : "auto",
    displayName: data.displayName || "User",
    locale: coerceSupportedLocale(data.language),
    onboardingCompletedAt: data.onboardingCompletedAt ?? null,
    timeFormat: data.timeFormat === "12h" ? "12h" : "24h",
    timezone: data.timezone || "UTC",
  };
}
