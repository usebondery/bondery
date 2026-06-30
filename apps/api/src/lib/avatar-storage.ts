/**
 * Avatar storage mutations and has_avatar flag maintenance.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";

const AVATARS_BUCKET = "avatars";

export function getContactAvatarStoragePath(userId: string, contactId: string): string {
  return `${userId}/${contactId}.jpg`;
}

export async function setContactHasAvatar(
  client: SupabaseClient<Database>,
  userId: string,
  contactId: string,
  hasAvatar: boolean,
): Promise<void> {
  const { error } = await client
    .from("people")
    .update({
      has_avatar: hasAvatar,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to update has_avatar for contact ${contactId}: ${error.message}`);
  }
}

export async function uploadContactAvatarFile(
  adminClient: SupabaseClient<Database>,
  userId: string,
  contactId: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const fileName = getContactAvatarStoragePath(userId, contactId);

  await adminClient.storage.from(AVATARS_BUCKET).remove([fileName]);

  const { error: uploadError } = await adminClient.storage
    .from(AVATARS_BUCKET)
    .upload(fileName, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload avatar for contact ${contactId}: ${uploadError.message}`);
  }
}

export async function deleteContactAvatarFile(
  adminClient: SupabaseClient<Database>,
  userId: string,
  contactId: string,
): Promise<void> {
  const fileName = getContactAvatarStoragePath(userId, contactId);
  await adminClient.storage.from(AVATARS_BUCKET).remove([fileName]);
}

export async function uploadContactAvatarAndSetFlag(
  client: SupabaseClient<Database>,
  adminClient: SupabaseClient<Database>,
  userId: string,
  contactId: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await uploadContactAvatarFile(adminClient, userId, contactId, buffer, contentType);
  await setContactHasAvatar(client, userId, contactId, true);
}

export async function deleteContactAvatarAndClearFlag(
  client: SupabaseClient<Database>,
  adminClient: SupabaseClient<Database>,
  userId: string,
  contactId: string,
): Promise<void> {
  await deleteContactAvatarFile(adminClient, userId, contactId);
  await setContactHasAvatar(client, userId, contactId, false);
}
