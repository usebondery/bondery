/**
 * Settings API Routes
 * Handles user settings/preferences
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createAdminClient, requireAuth } from "../lib/supabase.js";
import type { UpdateUserSettingsInput } from "@bondery/types";
import { validateImageUpload } from "../lib/config.js";

const AVATARS_BUCKET = "avatars";
const DEFAULT_REMINDER_SEND_HOUR = "08:00:00";

function isValidReminderSendHour(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value.trim());
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

function getEffectiveUserMetadata(user: SupabaseUserWithMetadata | undefined): UserMetadata {
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
 * Normalizes auth provider metadata into first name and surname values used by user settings.
 */
function getMetadataNameParts(userMetadata: UserMetadata | undefined): {
  name: string;
  surname: string;
} {
  const givenName = userMetadata?.given_name?.trim() || "";
  const familyName = userMetadata?.family_name?.trim() || "";

  if (givenName || familyName) {
    return {
      name: givenName,
      surname: familyName,
    };
  }

  const fullName = (userMetadata?.name || userMetadata?.full_name || "").trim();
  if (!fullName) {
    return { name: "", surname: "" };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { name: parts[0], surname: "" };
  }

  return {
    name: parts[0],
    surname: parts.slice(1).join(" "),
  };
}

/**
 * Returns avatar URL from auth metadata, including provider-specific keys.
 */
function getMetadataAvatarUrl(userMetadata: UserMetadata | undefined): string | null {
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
      console.warn("[settings] Failed to fetch provider avatar", {
        userId,
        avatarUrl,
        status: response.status,
      });
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const normalizedType = contentType.toLowerCase();
    const validationType =
      normalizedType.startsWith("image/") || normalizedType === "" ? "image/jpeg" : contentType;

    const validation = validateImageUpload({
      type: validationType,
      size: buffer.length,
    });

    if (!validation.isValid) {
      console.warn("[settings] Provider avatar failed validation", {
        userId,
        avatarUrl,
        contentType,
        size: buffer.length,
      });
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
      console.warn("[settings] Failed to upload provider avatar", {
        userId,
        fileName,
        message: uploadError.message,
      });
      return null;
    }

    const { data: publicUrlData } = adminClient.storage.from(AVATARS_BUCKET).getPublicUrl(fileName);

    return publicUrlData?.publicUrl ? `${publicUrlData.publicUrl}?t=${Date.now()}` : null;
  } catch (error) {
    console.warn("[settings] Provider avatar import crashed", {
      userId,
      avatarUrl,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function settingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/settings - Get user settings
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client, user } = auth;

    // Get user info for email/providers
    const { data: userData } = await client.auth.getUser();
    const userMetadata = getEffectiveUserMetadata(userData?.user as SupabaseUserWithMetadata);
    const metadataName = getMetadataNameParts(userMetadata);
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
          name: metadataName.name,
          middlename: "",
          surname: metadataName.surname,
          timezone: "UTC",
          reminder_send_hour: DEFAULT_REMINDER_SEND_HOUR,
          language: "en",
          color_scheme: "auto",
        })
        .select()
        .single();

      if (insertError) {
        return reply.status(500).send({ error: "Failed to create default settings" });
      }

      resolvedSettings = newSettings;
    }

    const hydrationUpdates: Record<string, string | null> = {};

    if (!resolvedSettings.name?.trim() && metadataName.name) {
      hydrationUpdates.name = metadataName.name;
    }

    if (!resolvedSettings.surname?.trim() && metadataName.surname) {
      hydrationUpdates.surname = metadataName.surname;
    }

    const currentAvatarUrl = resolvedSettings.avatar_url?.trim() || "";
    const hasManagedAvatar = currentAvatarUrl.includes("/avatars/");

    if (!hasManagedAvatar) {
      if (metadataAvatarUrl) {
        const storedAvatarUrl = await importMetadataAvatarToStorage(user.id, metadataAvatarUrl);
        hydrationUpdates.avatar_url = storedAvatarUrl;
      } else if (currentAvatarUrl) {
        hydrationUpdates.avatar_url = null;
      }
    }

    if (Object.keys(hydrationUpdates).length > 0) {
      const { data: hydratedSettings, error: hydrateError } = await client
        .from("user_settings")
        .update(hydrationUpdates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (!hydrateError && hydratedSettings) {
        resolvedSettings = hydratedSettings;
      }
    }

    return {
      success: true,
      data: {
        ...resolvedSettings,
        reminder_send_hour: resolvedSettings.reminder_send_hour ?? DEFAULT_REMINDER_SEND_HOUR,
        email: userData?.user?.email,
        avatar_url: resolvedSettings.avatar_url || null,
        providers: userData?.user?.app_metadata?.providers || [],
      },
    };
  });

  /**
   * PATCH /api/settings - Update user settings
   */
  fastify.patch(
    "/",
    async (request: FastifyRequest<{ Body: UpdateUserSettingsInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { name, middlename, surname, timezone, reminder_send_hour, language, color_scheme } =
        request.body || {};

      const updatePayload: UpdateUserSettingsInput = {};

      if (name !== undefined) updatePayload.name = name;
      if (middlename !== undefined) updatePayload.middlename = middlename;
      if (surname !== undefined) updatePayload.surname = surname;
      if (timezone !== undefined) updatePayload.timezone = timezone;
      if (reminder_send_hour !== undefined) {
        if (!isValidReminderSendHour(reminder_send_hour)) {
          return reply
            .status(400)
            .send({ error: "reminder_send_hour must be a valid time in HH:mm or HH:mm:ss format" });
        }
        updatePayload.reminder_send_hour = normalizeReminderSendHour(reminder_send_hour);
      }
      if (language !== undefined) updatePayload.language = language;
      if (color_scheme !== undefined) updatePayload.color_scheme = color_scheme;

      if (Object.keys(updatePayload).length === 0) {
        return reply.status(400).send({ error: "No settings fields provided" });
      }

      // Check if settings exist
      const { data: existingSettings } = await client
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let result;

      if (existingSettings) {
        // Update existing
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
        // Insert new
        const { data, error } = await client
          .from("user_settings")
          .insert({ user_id: user.id, ...updatePayload })
          .select()
          .single();

        if (error) {
          return reply.status(500).send({ error: "Failed to create settings" });
        }
        result = data;
      }

      // Sync display_name in auth.users
      const displayName = [result.name, result.middlename, result.surname]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (displayName) {
        await client.auth.updateUser({ data: { name: displayName } });
      }

      return { success: true, data: result };
    },
  );
}
