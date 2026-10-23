import type { AvatarTransformOptions } from "@bondery/schemas";
import { AVATARS_BUCKET, getStorage, LINKEDIN_LOGOS_BUCKET } from "./get-storage.js";

function toCacheBustToken(value: Date | string | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  const ts = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

export function buildContactAvatarUrl(
  userId: string,
  personId: string,
  _options?: AvatarTransformOptions,
  avatarUpdatedAt?: Date | string | null,
): string | null {
  const path = `${userId}/${personId}.jpg`;
  const storage = getStorage();
  let baseUrl = storage.getPublicUrl(AVATARS_BUCKET, path);

  const ts = toCacheBustToken(avatarUpdatedAt);
  if (ts != null) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    baseUrl = `${baseUrl}${sep}t=${ts}`;
  }

  return baseUrl;
}

export type ContactAvatarSource = {
  id: string;
  hasAvatar: boolean;
  avatarUpdatedAt?: Date | string | null;
};

export function resolveContactAvatarUrl(
  userId: string,
  contact: ContactAvatarSource,
  options?: AvatarTransformOptions,
): string | null {
  if (!contact.hasAvatar) {
    return null;
  }

  return buildContactAvatarUrl(userId, contact.id, options, contact.avatarUpdatedAt);
}

export function buildLinkedinLogoUrl(userId: string, linkedinId: string): string {
  const storage = getStorage();
  return storage.getPublicUrl(LINKEDIN_LOGOS_BUCKET, `${userId}/${linkedinId}.jpg`);
}
