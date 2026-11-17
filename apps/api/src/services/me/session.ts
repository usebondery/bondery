import type {
  ColorSchemePreference,
  DateFormatPreference,
  UserSessionData,
} from "@bondery/schemas";
import {
  coerceDateFormatPreference,
  DEFAULT_LOCALE,
} from "@bondery/schemas/locale/supported-locale";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { isPlatformAdmin } from "../../lib/auth/is-platform-admin.js";
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
  const db = domainDb(ctx);
  const { user } = ctx;

  const settings = await db.userSettings.findUnique({
    select: {
      colorScheme: true,
      dateFormat: true,
      language: true,
      onboardingCompletedAt: true,
      timeFormat: true,
      timezone: true,
    },
    where: { userId: user.id },
  });

  if (!settings) {
    throw internal("session_settings_missing");
  }

  const { firstName, avatarUrl } = await getMyselfProfile(db, user.id, SHELL_AVATAR_OPTIONS);

  return {
    avatarUrl,
    colorScheme: parseColorScheme(settings.colorScheme),
    dateFormat: coerceDateFormatPreference(settings.dateFormat) as DateFormatPreference,
    displayName: firstName?.trim() || user.email || "User",
    isPlatformAdmin: await isPlatformAdmin(user.id),
    language: settings.language ?? DEFAULT_LOCALE,
    onboardingCompletedAt: settings.onboardingCompletedAt?.toISOString() ?? null,
    timeFormat: settings.timeFormat === "12h" ? "12h" : DEFAULT_TIME_FORMAT,
    timezone: settings.timezone || "UTC",
  };
}

/** Idempotent signup setup: default settings row + optional provider avatar import. */
export async function initializeUserDefaults(ctx: DomainContext): Promise<void> {
  await ensureDefaultSettings(ctx);
  await syncProviderAvatarIfNeeded(ctx.user.id);
}
