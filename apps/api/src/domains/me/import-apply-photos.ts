import type { ImportTypeResult } from "@bondery/schemas";
import {
  setContactHasAvatarSynced,
  uploadContactAvatarFile,
} from "../../lib/contacts/avatar-storage.js";
import { withSyncedWrite } from "../../lib/sync/synced-write.js";
import type { DomainContext } from "../_shared/context.js";
import { typeResult } from "./import-helpers.js";

const PHOTO_UPLOAD_CONCURRENCY = 8;
const PHOTO_FLAG_TRANSACTION_TIMEOUT_MS = 120_000;

type InsertedPerson = { hasAvatar: boolean; id: string };

/**
 * Upload the photo files first, with bounded concurrency and outside any transaction. Then set
 * `has_avatar` for every stored photo and write the sync log in one transaction.
 */
export async function attachImportedPhotos(options: {
  ctx: DomainContext;
  insertedPeople: InsertedPerson[];
  insertedPersonIds: Set<string>;
  photos: Map<string, Buffer>;
  photosSkipped: number;
  remapPersonId: (sourceId: string) => string;
}): Promise<ImportTypeResult> {
  const { ctx, insertedPeople, insertedPersonIds, photos, photosSkipped, remapPersonId } = options;
  const userId = ctx.user.id;

  const insertedById = new Map(insertedPeople.map((person) => [person.id, person]));
  const photoEntries = [...photos.entries()];
  const storedIds: string[] = [];

  for (let index = 0; index < photoEntries.length; index += PHOTO_UPLOAD_CONCURRENCY) {
    const chunk = photoEntries.slice(index, index + PHOTO_UPLOAD_CONCURRENCY);
    const outcomes = await Promise.all(
      chunk.map(async ([sourceId, buffer]): Promise<string | null> => {
        const remappedId = remapPersonId(sourceId);
        if (remappedId === userId || !insertedPersonIds.has(remappedId)) {
          return null;
        }
        try {
          await uploadContactAvatarFile(userId, remappedId, buffer, "image/jpeg");
          return remappedId;
        } catch {
          return null;
        }
      }),
    );

    for (const remappedId of outcomes) {
      if (!remappedId) {
        continue;
      }
      storedIds.push(remappedId);
      const person = insertedById.get(remappedId);
      if (person) {
        person.hasAvatar = true;
      }
    }
  }

  if (storedIds.length > 0) {
    await withSyncedWrite(
      ctx,
      async (sw) => {
        for (const contactId of storedIds) {
          await setContactHasAvatarSynced(sw, contactId, true);
        }
      },
      { timeoutMs: PHOTO_FLAG_TRANSACTION_TIMEOUT_MS },
    );
  }

  return typeResult(photos.size, storedIds.length, photosSkipped);
}
