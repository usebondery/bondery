/**
 * Avatar storage mutations and has_avatar flag maintenance.
 */

import type { PrismaClient } from "@bondery/db";
import { isValidUuid } from "@bondery/helpers/ids";
import { AVATARS_BUCKET, deleteStorageObjects, getStorage } from "../storage/get-storage.js";
import { AVATAR_IMAGE_MAX_EDGE, normalizeImageToJpeg } from "../storage/normalize-image.js";
import {
  type SyncedWrite,
  type SyncedWriteContext,
  withSyncedWrite,
} from "../sync/synced-write.js";

const LEADING_SLASHES_PATTERN = /^\/+/;

export function getContactAvatarStoragePath(userId: string, contactId: string): string {
  return `${userId}/${contactId}.jpg`;
}

/** Returns the contact id when `key` is `{userId}/{uuid}.jpg` in the avatars bucket. */
export function contactIdFromAvatarStorageKey(userId: string, key: string): string | null {
  const expectedPrefix = `${userId}/`;
  const normalized = key.replace(LEADING_SLASHES_PATTERN, "");
  if (!normalized.startsWith(expectedPrefix) || !normalized.endsWith(".jpg")) {
    return null;
  }
  const fileName = normalized.slice(expectedPrefix.length);
  if (fileName.includes("/")) {
    return null;
  }
  const contactId = fileName.slice(0, -".jpg".length);
  return isValidUuid(contactId) ? contactId : null;
}

/**
 * Update the avatar flag and timestamps on one contact row. This writes the row only. The caller
 * must record the change for the sync log, either with `setContactHasAvatarSynced` or by
 * emitting the contact snapshot itself (the merge flow does).
 */
export async function setContactHasAvatar(
  db: PrismaClient,
  userId: string,
  contactId: string,
  hasAvatar: boolean,
): Promise<void> {
  await db.people.updateMany({
    data: {
      avatarUpdatedAt: hasAvatar ? new Date() : null,
      hasAvatar,
      updatedAt: new Date(),
    },
    where: { id: contactId, userId },
  });
}

/** Set the avatar flag inside a `withSyncedWrite` and record the contact row for the sync log. */
export async function setContactHasAvatarSynced(
  sw: SyncedWrite,
  contactId: string,
  hasAvatar: boolean,
): Promise<void> {
  await setContactHasAvatar(sw.db, sw.userId, contactId, hasAvatar);
  sw.touch("people", [contactId]);
}

export async function uploadContactAvatarFile(
  userId: string,
  contactId: string,
  buffer: Buffer,
  _contentType: string,
): Promise<void> {
  const fileName = getContactAvatarStoragePath(userId, contactId);
  const storage = getStorage();
  const normalized = await normalizeImageToJpeg(buffer, { maxEdge: AVATAR_IMAGE_MAX_EDGE });

  await storage.delete(AVATARS_BUCKET, fileName);
  await storage.put(AVATARS_BUCKET, fileName, normalized, { contentType: "image/jpeg" });
}

export async function areContactAvatarFilesIdentical(
  userId: string,
  leftContactId: string,
  rightContactId: string,
): Promise<boolean> {
  const storage = getStorage();
  const [left, right] = await Promise.all([
    storage.get(AVATARS_BUCKET, getContactAvatarStoragePath(userId, leftContactId)),
    storage.get(AVATARS_BUCKET, getContactAvatarStoragePath(userId, rightContactId)),
  ]);
  if (!left || !right) {
    return false;
  }
  return left.equals(right);
}

export async function deleteContactAvatarFile(userId: string, contactId: string): Promise<void> {
  const fileName = getContactAvatarStoragePath(userId, contactId);
  await getStorage().delete(AVATARS_BUCKET, fileName);
}

/**
 * Store the avatar file, then set `has_avatar` and write the sync log in one transaction.
 * The upload runs first and outside the transaction, so storage latency never holds a lock.
 */
export async function uploadContactAvatarAndSetFlag(
  ctx: SyncedWriteContext,
  contactId: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await uploadContactAvatarFile(ctx.user.id, contactId, buffer, contentType);
  await withSyncedWrite(ctx, (sw) => setContactHasAvatarSynced(sw, contactId, true));
}

/** Delete the avatar file, then clear `has_avatar` and write the sync log in one transaction. */
export async function deleteContactAvatarAndClearFlag(
  ctx: SyncedWriteContext,
  contactId: string,
): Promise<void> {
  await deleteContactAvatarFile(ctx.user.id, contactId);
  await withSyncedWrite(ctx, (sw) => setContactHasAvatarSynced(sw, contactId, false));
}

/** Remove avatar files for multiple contacts without touching DB flags. */
export async function deleteContactAvatarFiles(
  userId: string,
  contactIds: string[],
): Promise<void> {
  const keys = contactIds.map((contactId) => getContactAvatarStoragePath(userId, contactId));
  await deleteStorageObjects(AVATARS_BUCKET, keys);
}
