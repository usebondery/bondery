/**
 * Me Settings API Routes
 * Handles user settings/preferences
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { createAdminClient } from "../../../lib/supabase.js";
import { getAuth } from "../../../lib/auth.js";
import {
  validateImageUpload,
  validateImageMagicBytes,
} from "../../../lib/config.js";
import logger from "../../../lib/logger.js";
import type { TablesUpdate } from "@bondery/schemas";
import { getMyselfProfile } from "../../../lib/myself.js";

// ── TypeBox Schemas ──────────────────────────────────────────────────────────

const UpdateSettingsBody = Type.Object({
  timezone: Type.Optional(Type.String()),
  reminderSendHour: Type.Optional(
    Type.String({ pattern: "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$" }),
  ),
  timeFormat: Type.Optional(
    Type.Union([Type.Literal("24h"), Type.Literal("12h")]),
  ),
  language: Type.Optional(
    Type.Union([Type.Literal("en"), Type.Literal("cs")]),
  ),
  colorScheme: Type.Optional(
    Type.Union([
      Type.Literal("light"),
      Type.Literal("dark"),
      Type.Literal("auto"),
    ]),
  ),
  leftSwipeAction: Type.Optional(
    Type.Union([
      Type.Literal("call"),
      Type.Literal("message"),
      Type.Literal("email"),
    ]),
  ),
  rightSwipeAction: Type.Optional(
    Type.Union([
      Type.Literal("call"),
      Type.Literal("message"),
      Type.Literal("email"),
    ]),
  ),
  groupSortOrder: Type.Optional(
    Type.Union([
      Type.Literal("recent-opened"),
      Type.Literal("count-desc"),
      Type.Literal("count-asc"),
      Type.Literal("alpha-asc"),
      Type.Literal("alpha-desc"),
    ]),
  ),
  tagSortOrder: Type.Optional(
    Type.Union([
      Type.Literal("count-desc"),
      Type.Literal("count-asc"),
      Type.Literal("alpha-asc"),
      Type.Literal("alpha-desc"),
    ]),
  ),
  /** When true, apply updates only for accounts created within the last 30 seconds. */
  onlyIfNewSignup: Type.Optional(Type.Boolean()),
});

const AVATARS_BUCKET = "avatars";
const DEFAULT_REMINDER_SEND_HOUR = "08:00:00";
const DEFAULT_TIME_FORMAT = "24h" as const;
const DEFAULT_LEFT_SWIPE_ACTION = "message" as const;
const DEFAULT_RIGHT_SWIPE_ACTION = "call" as const;
const DEFAULT_GROUP_SORT_ORDER = "count-desc" as const;
const DEFAULT_TAG_SORT_ORDER = "count-desc" as const;
const NEW_SIGNUP_WINDOW_MS = 30_000;

function formatSettingsPatchData(result: {
  timezone?: string | null;
  reminder_send_hour?: string | null;
  time_format?: string | null;
  language?: string | null;
  color_scheme?: string | null;
  left_swipe_action?: string | null;
  right_swipe_action?: string | null;
  group_sort_order?: string | null;
  tag_sort_order?: string | null;
}) {
  return {
    timezone: result.timezone,
    reminderSendHour: result.reminder_send_hour,
    timeFormat: result.time_format,
    language: result.language,
    colorScheme: result.color_scheme,
    leftSwipeAction: result.left_swipe_action,
    rightSwipeAction: result.right_swipe_action,
    groupSortOrder: result.group_sort_order,
    tagSortOrder: result.tag_sort_order,
  };
}

type UserIdentityRow = {
  id: string;
  user_id: string;
  identity_id: string;
  provider: string;
};

function mapUserIdentities(
  identities: Array<{
    id?: string;
    user_id?: string;
    identity_id?: string;
    provider?: string;
  }> | null | undefined,
): UserIdentityRow[] {
  if (!identities?.length) {
    return [];
  }

  return identities
    .filter(
      (identity): identity is {
        id: string;
        user_id: string;
        identity_id: string;
        provider: string;
      } =>
        typeof identity.id === "string" &&
        typeof identity.user_id === "string" &&
        typeof identity.identity_id === "string" &&
        typeof identity.provider === "string",
    )
    .map((identity) => ({
      id: identity.id,
      user_id: identity.user_id,
      identity_id: identity.identity_id,
      provider: identity.provider,
    }));
}

function normalizeReminderSendHour(value: string): string {
  const [hourPart, minutePart, secondPart] = value.trim().split(":");
  const normalizedHour = hourPart.padStart(2, "0");
  const normalizedMinute = minutePart.padStart(2, "0");
  const normalizedSecond = (secondPart || "00").padStart(2, "0");

  return `${normalizedHour}:${normalizedMinute}:${normalizedSecond}`;
}

function getAccountAvatarFileName(userId: string): string {
  return `${userId}/${userId}.jpg`;
}

type UserMetadata = {
  name?: string;
  full_name?: string;
  given_name?: string;
  family_name?: string;
  avatar_url?: string;
  picture?: string;
};

type SupabaseUserWithMetadata = {
  user_metadata?: UserMetadata;
  identities?: Array<{
    provider?: string;
    identity_data?: UserMetadata;
  }>;
};

function getEffectiveUserMetadata(
  user: SupabaseUserWithMetadata | undefined,
): UserMetadata {
  const baseMetadata = user?.user_metadata || {};
  const linkedInIdentity = (user?.identities || []).find(
    (identity) => identity.provider === "linkedin_oidc",
  );
  const identityMetadata = linkedInIdentity?.identity_data || {};

  return {
    ...identityMetadata,
    ...baseMetadata,
  };
}

/**
 * Returns avatar URL from auth metadata, including provider-specific keys.
 */
function getMetadataAvatarUrl(
  userMetadata: UserMetadata | undefined,
): string | null {
  return userMetadata?.avatar_url || userMetadata?.picture || null;
}

async function importMetadataAvatarToStorage(
  userId: string,
  avatarUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(avatarUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      logger.warn(
        { userId, avatarUrl, status: response.status },
        "[settings] Failed to fetch provider avatar",
      );
      return null;
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() || "";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const normalizedType = contentType.toLowerCase();
    const validationType =
      normalizedType.startsWith("image/") || normalizedType === ""
        ? "image/jpeg"
        : contentType;

    const validation = validateImageUpload({
      type: validationType,
      size: buffer.length,
    });

    if (!validation.isValid) {
      logger.warn(
        { userId, avatarUrl, contentType, size: buffer.length },
        "[settings] Provider avatar failed validation",
      );
      return null;
    }

    if (!validateImageMagicBytes(buffer)) {
      logger.warn(
        { userId, avatarUrl },
        "[settings] Provider avatar failed magic bytes validation",
      );
      return null;
    }

    const fileName = getAccountAvatarFileName(userId);
    const adminClient = createAdminClient();

    await adminClient.storage.from(AVATARS_BUCKET).remove([fileName]);

    const { error: uploadError } = await adminClient.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, buffer, {
        contentType: validationType,
        upsert: true,
      });

    if (uploadError) {
      logger.warn(
        { userId, fileName, message: uploadError.message },
        "[settings] Failed to upload provider avatar",
      );
      return null;
    }

    const { data: publicUrlData } = adminClient.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl
      ? `${publicUrlData.publicUrl}?t=${Date.now()}`
      : null;
  } catch (error) {
    logger.warn(
      {
        userId,
        avatarUrl,
        message: error instanceof Error ? error.message : String(error),
      },
      "[settings] Provider avatar import crashed",
    );
    return null;
  }
}

export async function meSettingsRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Me"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/me/settings - Get user settings
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);
    const adminClient = createAdminClient();

    // Get user info for email/providers
    const { data: userData } = await client.auth.getUser();
    const userMetadata = getEffectiveUserMetadata(
      userData?.user as SupabaseUserWithMetadata,
    );
    const metadataAvatarUrl = getMetadataAvatarUrl(userMetadata);

    // Get settings from database
    const { data: settings, error } = await client
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return reply.status(500).send({ error: "Failed to fetch settings" });
    }

    let resolvedSettings = settings;

    // Insert defaults if no settings exist
    if (!resolvedSettings) {
      const { data: newSettings, error: insertError } = await client
        .from("user_settings")
        .insert({
          user_id: user.id,
          timezone: "UTC",
          reminder_send_hour: DEFAULT_REMINDER_SEND_HOUR,
          time_format: DEFAULT_TIME_FORMAT,
          language: "en",
          color_scheme: "auto",
          next_reminder_at_utc: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        return reply
          .status(500)
          .send({ error: "Failed to create default settings" });
      }

      resolvedSettings = newSettings;
    }

    // Derive avatar URL deterministically from storage path.
    // Import provider avatar to storage on first load if not already stored.
    const { data: existingFiles } = await adminClient.storage
      .from(AVATARS_BUCKET)
      .list(user.id, { search: `${user.id}.jpg`, limit: 1 });
    const hasStoredAvatar = (existingFiles ?? []).some(
      (f) => f.name === `${user.id}.jpg`,
    );

    if (!hasStoredAvatar && metadataAvatarUrl) {
      await importMetadataAvatarToStorage(user.id, metadataAvatarUrl);
    }

    const { firstName, avatarUrl: resolvedAvatarUrl } = await getMyselfProfile(
      client,
      user.id,
    );

    const { data: identitiesData } = await client.auth.getUserIdentities();
    const identities = mapUserIdentities(identitiesData?.identities);

    return {
      success: true,
      data: {
        name: firstName,
        timezone: resolvedSettings.timezone,
        reminderSendHour:
          resolvedSettings.reminder_send_hour ?? DEFAULT_REMINDER_SEND_HOUR,
        timeFormat: resolvedSettings.time_format ?? DEFAULT_TIME_FORMAT,
        language: resolvedSettings.language ?? "en",
        colorScheme: resolvedSettings.color_scheme,
        leftSwipeAction:
          resolvedSettings.left_swipe_action ?? DEFAULT_LEFT_SWIPE_ACTION,
        rightSwipeAction:
          resolvedSettings.right_swipe_action ?? DEFAULT_RIGHT_SWIPE_ACTION,
        groupSortOrder:
          resolvedSettings.group_sort_order ?? DEFAULT_GROUP_SORT_ORDER,
        tagSortOrder: resolvedSettings.tag_sort_order ?? DEFAULT_TAG_SORT_ORDER,
        avatarUrl: resolvedAvatarUrl,
        onboardingCompletedAt: resolvedSettings.onboarding_completed_at ?? null,
        aiMessagesUsed: resolvedSettings.ai_messages_used ?? 0,
        email: userData?.user?.email,
        providers: userData?.user?.app_metadata?.providers || [],
        identities,
      },
    };
  });

  /**
   * PATCH /api/me/settings - Update user settings
   */
  fastify.patch(
    "/",
    { schema: { body: UpdateSettingsBody } },
    async (
      request: FastifyRequest<{
        Body: {
          timezone?: string;
          reminderSendHour?: string;
          timeFormat?: "24h" | "12h";
          language?: "en" | "cs";
          colorScheme?: "light" | "dark" | "auto";
          leftSwipeAction?: "call" | "message" | "email";
          rightSwipeAction?: "call" | "message" | "email";
          groupSortOrder?:
            | "recent-opened"
            | "count-desc"
            | "count-asc"
            | "alpha-asc"
            | "alpha-desc";
          tagSortOrder?: "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";
          onlyIfNewSignup?: boolean;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const {
        timezone,
        reminderSendHour,
        language,
        colorScheme,
        leftSwipeAction,
        rightSwipeAction,
        groupSortOrder,
        tagSortOrder,
        timeFormat,
        onlyIfNewSignup,
      } = request.body || {};

      const updatePayload: TablesUpdate<"user_settings"> = {};

      if (timezone !== undefined) updatePayload.timezone = timezone;
      if (reminderSendHour !== undefined) {
        updatePayload.reminder_send_hour =
          normalizeReminderSendHour(reminderSendHour);
      }
      if (language !== undefined) {
        updatePayload.language = language;
      }
      if (colorScheme !== undefined) updatePayload.color_scheme = colorScheme;
      if (timeFormat !== undefined) {
        updatePayload.time_format = timeFormat;
      }
      if (leftSwipeAction !== undefined) {
        updatePayload.left_swipe_action = leftSwipeAction;
      }
      if (rightSwipeAction !== undefined) {
        updatePayload.right_swipe_action = rightSwipeAction;
      }
      if (groupSortOrder !== undefined) {
        updatePayload.group_sort_order = groupSortOrder;
      }
      if (tagSortOrder !== undefined) {
        updatePayload.tag_sort_order = tagSortOrder;
      }

      if (Object.keys(updatePayload).length === 0) {
        return reply.status(400).send({ error: "No settings fields provided" });
      }

      if (onlyIfNewSignup) {
        const { data: signupSettings } = await client
          .from("user_settings")
          .select(
            "created_at, timezone, reminder_send_hour, time_format, language, color_scheme",
          )
          .eq("user_id", user.id)
          .single();

        const isNewSignup =
          signupSettings?.created_at &&
          Date.now() - new Date(signupSettings.created_at).getTime() <
            NEW_SIGNUP_WINDOW_MS;

        if (!isNewSignup) {
          return {
            success: true,
            skipped: true,
            data: signupSettings
              ? formatSettingsPatchData(signupSettings)
              : null,
          };
        }
      }

      const { data: existingSettings } = await client
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let result;

      if (existingSettings) {
        const { data, error } = await client
          .from("user_settings")
          .update(updatePayload)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          return reply.status(500).send({ error: "Failed to update settings" });
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
          return reply.status(500).send({ error: "Failed to create settings" });
        }
        result = data;
      }

      return {
        success: true,
        data: formatSettingsPatchData(result),
      };
    },
  );
}
