/**
 * Best-effort import of OAuth provider avatar into storage for the myself contact.
 */

import { prisma } from "@bondery/db";
import {
  getContactAvatarStoragePath,
  uploadContactAvatarAndSetFlag,
} from "../../lib/contacts/avatar-storage.js";
import { firstNonBlank } from "../../lib/platform/blank-text.js";
import { validateImageMagicBytes, validateImageUpload } from "../../lib/platform/config.js";
import logger from "../../lib/platform/logger.js";
import { AVATARS_BUCKET, getStorage } from "../../lib/storage/get-storage.js";

type UserMetadata = {
  avatar_url?: string;
  picture?: string;
};

function getMetadataAvatarUrl(userMetadata: UserMetadata | undefined): string | null {
  return firstNonBlank(userMetadata?.avatar_url, userMetadata?.picture);
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

    await uploadContactAvatarAndSetFlag(prisma, userId, userId, buffer, validationType);

    const publicUrl = getStorage().getPublicUrl(
      AVATARS_BUCKET,
      getContactAvatarStoragePath(userId, userId),
    );

    return publicUrl ? `${publicUrl}?t=${Date.now()}` : null;
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
export async function syncProviderAvatarIfNeeded(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    select: { image: true },
    where: { id: userId },
  });

  const metadataAvatarUrl = getMetadataAvatarUrl({ picture: user?.image ?? undefined });

  const myselfRow = await prisma.people.findFirst({
    select: { hasAvatar: true },
    where: { myself: true, userId },
  });

  const hasStoredAvatar = myselfRow?.hasAvatar ?? false;

  if (!hasStoredAvatar && metadataAvatarUrl) {
    await importMetadataAvatarToStorage(userId, metadataAvatarUrl);
  }
}
