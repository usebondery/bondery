/**
 * Best-effort import of OAuth provider avatar into storage for the myself contact.
 */

import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadContactAvatarAndSetFlag } from "../../lib/contacts/avatar-storage.js";
import { createAdminClient } from "../../lib/data/supabase.js";
import { validateImageMagicBytes, validateImageUpload } from "../../lib/platform/config.js";
import logger from "../../lib/platform/logger.js";

const AVATARS_BUCKET = "avatars";

type UserMetadata = {
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

function getAccountAvatarFileName(userId: string): string {
  return `${userId}/${userId}.jpg`;
}

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

function getMetadataAvatarUrl(userMetadata: UserMetadata | undefined): string | null {
  return userMetadata?.avatar_url || userMetadata?.picture || null;
}

async function importMetadataAvatarToStorage(
  client: SupabaseClient<Database>,
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
        { avatarUrl, status: response.status, userId },
        "[me] Failed to fetch provider avatar",
      );
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const normalizedType = contentType.toLowerCase();
    const validationType =
      normalizedType.startsWith("image/") || normalizedType === "" ? "image/jpeg" : contentType;

    const validation = validateImageUpload({
      size: buffer.length,
      type: validationType,
    });

    if (!validation.isValid) {
      logger.warn(
        { avatarUrl, contentType, size: buffer.length, userId },
        "[me] Provider avatar failed validation",
      );
      return null;
    }

    if (!validateImageMagicBytes(buffer)) {
      logger.warn({ avatarUrl, userId }, "[me] Provider avatar failed magic bytes validation");
      return null;
    }

    const adminClient = createAdminClient();

    await uploadContactAvatarAndSetFlag(
      client,
      adminClient,
      userId,
      userId,
      buffer,
      validationType,
    );

    const { data: publicUrlData } = adminClient.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(getAccountAvatarFileName(userId));

    return publicUrlData?.publicUrl ? `${publicUrlData.publicUrl}?t=${Date.now()}` : null;
  } catch (error) {
    logger.warn(
      {
        avatarUrl,
        message: error instanceof Error ? error.message : String(error),
        userId,
      },
      "[me] Provider avatar import crashed",
    );
    return null;
  }
}

/** Import provider avatar when myself contact has no stored avatar yet. */
export async function syncProviderAvatarIfNeeded(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data: userData } = await client.auth.getUser();
  const userMetadata = getEffectiveUserMetadata(userData?.user as SupabaseUserWithMetadata);
  const metadataAvatarUrl = getMetadataAvatarUrl(userMetadata);

  const { data: myselfRow } = await client
    .from("people")
    .select("has_avatar")
    .eq("user_id", userId)
    .eq("myself", true)
    .single();

  const hasStoredAvatar = myselfRow?.has_avatar ?? false;

  if (!hasStoredAvatar && metadataAvatarUrl) {
    await importMetadataAvatarToStorage(client, userId, metadataAvatarUrl);
  }
}
