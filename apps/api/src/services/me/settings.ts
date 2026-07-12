import type { Tables, TablesUpdate, UpdateSettingsBody } from "@bondery/schemas";
import { DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

export type UserSettingsLanguage = NonNullable<TablesUpdate<"user_settings">["language"]>;

const DEFAULT_REMINDER_SEND_HOUR = "08:00:00";
const NEW_SIGNUP_WINDOW_MS = 30_000;

function normalizeReminderSendHour(value: string): string {
  const [hourPart, minutePart, secondPart] = value.trim().split(":");
  const normalizedHour = hourPart.padStart(2, "0");
  const normalizedMinute = minutePart.padStart(2, "0");
  const normalizedSecond = (secondPart || "00").padStart(2, "0");
  return `${normalizedHour}:${normalizedMinute}:${normalizedSecond}`;
}

export function formatSettingsPatchData(result: {
  timezone?: string | null;
  reminder_send_hour?: string | null;
  time_format?: string | null;
  language?: UserSettingsLanguage | null;
  color_scheme?: string | null;
  left_swipe_action?: string | null;
  right_swipe_action?: string | null;
  group_sort_order?: string | null;
  tag_sort_order?: string | null;
}) {
  return {
    colorScheme: result.color_scheme,
    groupSortOrder: result.group_sort_order,
    language: result.language,
    leftSwipeAction: result.left_swipe_action,
    reminderSendHour: result.reminder_send_hour,
    rightSwipeAction: result.right_swipe_action,
    tagSortOrder: result.tag_sort_order,
    timeFormat: result.time_format,
    timezone: result.timezone,
  };
}

export async function ensureDefaultSettings(ctx: DomainContext) {
  const { client, user } = ctx;

  const { data: settings, error } = await client
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    throw internal("settings_failed_to_fetch_settings");
  }

  if (settings) {
    return settings;
  }

  const { data: newSettings, error: insertError } = await client
    .from("user_settings")
    .insert({
      color_scheme: "auto",
      language: DEFAULT_LOCALE as UserSettingsLanguage,
      next_reminder_at_utc: new Date().toISOString(),
      reminder_send_hour: DEFAULT_REMINDER_SEND_HOUR,
      time_format: "24h",
      timezone: "UTC",
      user_id: user.id,
    })
    .select()
    .single();

  if (insertError) {
    throw internal("settings_failed_to_create_default_settings");
  }

  return newSettings;
}

export async function updateUserSettings(ctx: DomainContext, input: UpdateSettingsBody) {
  const { client, user } = ctx;

  const updatePayload: TablesUpdate<"user_settings"> = {};
  if (input.timezone !== undefined) {
    updatePayload.timezone = input.timezone;
  }
  if (input.reminderSendHour !== undefined) {
    updatePayload.reminder_send_hour = normalizeReminderSendHour(input.reminderSendHour);
  }
  if (input.language !== undefined) {
    updatePayload.language = input.language as UserSettingsLanguage;
  }
  if (input.colorScheme !== undefined) {
    updatePayload.color_scheme = input.colorScheme as TablesUpdate<"user_settings">["color_scheme"];
  }
  if (input.timeFormat !== undefined) {
    updatePayload.time_format = input.timeFormat;
  }
  if (input.leftSwipeAction !== undefined) {
    updatePayload.left_swipe_action = input.leftSwipeAction;
  }
  if (input.rightSwipeAction !== undefined) {
    updatePayload.right_swipe_action = input.rightSwipeAction;
  }
  if (input.groupSortOrder !== undefined) {
    updatePayload.group_sort_order = input.groupSortOrder;
  }
  if (input.tagSortOrder !== undefined) {
    updatePayload.tag_sort_order = input.tagSortOrder;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new DomainError("No settings fields provided", 400, "settings_no_fields");
  }

  if (input.onlyIfNewSignup) {
    const { data: signupSettings } = await client
      .from("user_settings")
      .select("created_at, timezone, reminder_send_hour, time_format, language, color_scheme")
      .eq("user_id", user.id)
      .single();

    const isNewSignup =
      signupSettings?.created_at &&
      Date.now() - new Date(signupSettings.created_at).getTime() < NEW_SIGNUP_WINDOW_MS;

    if (!isNewSignup) {
      return {
        data: signupSettings ? formatSettingsPatchData(signupSettings) : null,
        skipped: true as const,
        success: true as const,
      };
    }
  }

  const { data: existingSettings } = await client
    .from("user_settings")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let result: Tables<"user_settings">;
  if (existingSettings) {
    const { data, error } = await client
      .from("user_settings")
      .update(updatePayload)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      throw internal("settings_failed_to_update_settings");
    }
    result = data;
  } else {
    const { data, error } = await client
      .from("user_settings")
      .insert({
        user_id: user.id,
        ...updatePayload,
        next_reminder_at_utc: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw internal("settings_failed_to_create_settings");
    }
    result = data;
  }

  return {
    data: formatSettingsPatchData(result),
    success: true as const,
  };
}
