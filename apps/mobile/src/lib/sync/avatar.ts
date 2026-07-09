import { normalizeMobileUrlForDevice, SUPABASE_URL } from "../config";
import { supabase } from "../supabase/client";

export function resolveLocalContactAvatarUrl(
  userId: string,
  personId: string,
  hasAvatar: boolean,
  updatedAt?: string | null,
): string | null {
  if (!hasAvatar || !supabase || !userId) {
    return null;
  }

  const path = `${userId}/${personId}.jpg`;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const baseUrl = data?.publicUrl ?? null;
  if (!baseUrl) {
    return null;
  }

  const cacheBust = updatedAt ? `?t=${Date.parse(updatedAt)}` : "";
  return normalizeMobileUrlForDevice(`${baseUrl}${cacheBust}`);
}

export function resolveStoragePublicUrl(path: string): string | null {
  if (!supabase) {
    return null;
  }
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data?.publicUrl ? normalizeMobileUrlForDevice(data.publicUrl) : null;
}

/** Fallback when Supabase client unavailable — construct from public URL pattern. */
export function resolveAvatarUrlFromBase(
  userId: string,
  personId: string,
  hasAvatar: boolean,
  updatedAt?: string | null,
): string | null {
  if (!hasAvatar || !SUPABASE_URL) {
    return null;
  }
  const base = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/avatars/${userId}/${personId}.jpg`;
  const cacheBust = updatedAt ? `?t=${Date.parse(updatedAt)}` : "";
  return normalizeMobileUrlForDevice(`${base}${cacheBust}`);
}
