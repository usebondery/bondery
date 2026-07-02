import { cache } from "react";
import { isApiUnavailableResponseStatus } from "@/lib/api/availability";
import { serverApiFetch } from "@/lib/api/server";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";
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

export type AppBootstrapResult =
  | { status: "ok"; settings: UserSettingsData }
  | { status: "unauthorized" }
  | { status: "unavailable" };

function parseSettingsPayload(settings: Record<string, unknown>): UserSettingsData {
  const colorScheme: ColorSchemePreference =
    settings.colorScheme === "light" ||
    settings.colorScheme === "dark" ||
    settings.colorScheme === "auto"
      ? settings.colorScheme
      : "auto";

  const rawLocale: string = (settings.language as string | undefined) ?? "en";
  const locale: SupportedLocale = (SUPPORTED_LOCALES as readonly string[]).includes(rawLocale)
    ? (rawLocale as SupportedLocale)
    : "en";

  return {
    userName: (settings.name as string | undefined) || (settings.email as string | undefined) || "User",
    userEmail: (settings.email as string | undefined) || "",
    avatarUrl: (settings.avatarUrl as string | null | undefined) ?? null,
    locale,
    timezone: (settings.timezone as string | undefined) || "UTC",
    timeFormat: settings.timeFormat === "12h" ? "12h" : "24h",
    colorScheme,
    onboardingCompletedAt: (settings.onboardingCompletedAt as string | null | undefined) ?? null,
    aiMessagesUsed: (settings.aiMessagesUsed as number | undefined) ?? 0,
  };
}

/**
 * Server routing probe: settings fetch + tri-state outcome for app layout guards.
 *
 * Wrapped in React cache() so it executes at most once per server render.
 */
export const getAppBootstrap = cache(async (): Promise<AppBootstrapResult> => {
  const session = await resolveServerSession();
  if (session.status !== "ok") {
    return { status: "unauthorized" };
  }

  try {
    const response = await serverApiFetch(API_ROUTES.ME_SETTINGS, undefined, {
      cache: "no-store",
    });

    if (response.status === 401) {
      return { status: "unauthorized" };
    }

    if (isApiUnavailableResponseStatus(response.status)) {
      return { status: "unavailable" };
    }

    if (response.ok) {
      const result = await response.json();
      const settings = result?.data ?? {};
      return { status: "ok", settings: parseSettingsPayload(settings) };
    }

    return { status: "unavailable" };
  } catch (error) {
    console.error("[getAppBootstrap] Failed to fetch user settings:", error);
    return { status: "unavailable" };
  }
});
