import { normalizeMobileUrlForDevice, STORAGE_URL } from "../config";
import { toCacheBustToken } from "./avatar-clock";

export { parseAvatarUpdatedAtFromUrl } from "./avatar-clock";

export function resolveLocalContactAvatarUrl(
  userId: string,
  personId: string,
  hasAvatar: boolean,
  avatarUpdatedAt?: string | null,
): string | null {
  if (!hasAvatar || !STORAGE_URL || !userId) {
    return null;
  }

  const path = `${userId}/${personId}.jpg`;
  const baseUrl = `${STORAGE_URL.replace(/\/+$/, "")}/avatars/${path}`;
  const ts = toCacheBustToken(avatarUpdatedAt);
  const cacheBust = ts != null ? `?t=${ts}` : "";
  return normalizeMobileUrlForDevice(`${baseUrl}${cacheBust}`);
}

export function resolveStoragePublicUrl(path: string): string | null {
  if (!STORAGE_URL) {
    return null;
  }

  const url = `${STORAGE_URL.replace(/\/+$/, "")}/avatars/${path.replace(/^\/+/, "")}`;
  return normalizeMobileUrlForDevice(url);
}
