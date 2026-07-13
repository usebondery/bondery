import type { ColorSchemePreference, UserSessionData } from "@bondery/schemas";
import { DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import type { DomainContext } from "../../domains/_shared/context.js";
import { getMyselfProfile } from "../../lib/contacts/myself.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { syncProviderAvatarIfNeeded } from "./provider-avatar-import.js";
import { ensureDefaultSettings } from "./settings.js";

const SHELL_AVATAR_OPTIONS = { quality: "low" as const, size: "small" as const };
const DEFAULT_TIME_FORMAT = "24h" as const;

function parseColorScheme(value: string | null | undefined): ColorSchemePreference {
  if (value === "light" || value === "dark" || value === "auto") {
    return value;
  }
  return "auto";
}

export async function getUserSession(ctx: DomainContext): Promise<UserSessionData> {
  const { client, user } = ctx;

  const { data: settings, error } = await client
    .from("user_settings")
    .select("color_scheme, language, timezone, time_format, onboarding_completed_at")
    .eq("user_id", user.id)
    .single();

  if (error || !settings) {
    throw internal("session_settings_missing");
  }

  const { firstName, avatarUrl } = await getMyselfProfile(client, user.id, SHELL_AVATAR_OPTIONS);

  return {
    avatarUrl,
    colorScheme: parseColorScheme(settings.color_scheme),
    displayName: firstName?.trim() || user.email || "User",
    language: settings.language ?? DEFAULT_LOCALE,
    onboardingCompletedAt: settings.onboarding_completed_at ?? null,
    timeFormat: settings.time_format === "12h" ? "12h" : DEFAULT_TIME_FORMAT,
    timezone: settings.timezone || "UTC",
  };
}

/** Idempotent signup setup: default settings row + optional provider avatar import. */
export async function initializeUserDefaults(ctx: DomainContext): Promise<void> {
  await ensureDefaultSettings(ctx);
  await syncProviderAvatarIfNeeded(ctx.client, ctx.user.id);
}
