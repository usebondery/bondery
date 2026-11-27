import {
  deleteContactAvatarFile,
  setContactHasAvatarSynced,
  uploadContactAvatarFile,
} from "../../lib/contacts/avatar-storage.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";
import { withSyncedWriteResult } from "../../lib/sync/synced-write.js";
import { type DomainContext, DomainError } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

/** Set or clear `has_avatar` and write the sync log in one transaction. */
async function setAvatarFlagAndEmit(
  ctx: DomainContext,
  contactId: string,
  hasAvatar: boolean,
): Promise<{ txid: string; serverSequence: number }> {
  const { value: txid, serverSequence } = await withSyncedWriteResult(ctx, async (sw) => {
    await setContactHasAvatarSynced(sw, contactId, hasAvatar);
    return captureCurrentSyncTxid(sw.db);
  });
  return { serverSequence: serverSequence ?? 0, txid };
}

async function assertContactExists(
  ctx: DomainContext,
  contactId: string,
): Promise<{ id: string; myself: boolean | null }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const contact = await db.people.findFirst({
    select: { id: true, myself: true },
    where: { id: contactId, userId: user.id },
  });

  if (!contact) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  return { id: contact.id, myself: contact.myself };
}

export async function uploadContactPhoto(
  ctx: DomainContext,
  contactId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{
  data: { success: true; avatarUrl: string | null };
  txid: string;
  serverSequence: number;
}> {
  await assertContactExists(ctx, contactId);

  const { user } = ctx;
  const db = domainDb(ctx);

  // The upload is slow external I/O, so it finishes before the transaction opens.
  try {
    await uploadContactAvatarFile(user.id, contactId, buffer, mimeType);
  } catch (error) {
    throw internal("contact_failed_to_upload_photo", error);
  }
  const { serverSequence, txid } = await setAvatarFlagAndEmit(ctx, contactId, true);

  const person = await db.people.findFirst({
    select: { avatarUpdatedAt: true },
    where: { id: contactId, userId: user.id },
  });
  const avatarUrl = resolveContactAvatarUrl(user.id, {
    avatarUpdatedAt: person?.avatarUpdatedAt,
    hasAvatar: true,
    id: contactId,
  });

  return {
    data: { avatarUrl, success: true },
    serverSequence,
    txid,
  };
}

export async function deleteContactPhoto(
  ctx: DomainContext,
  contactId: string,
): Promise<{ data: { success: true }; txid: string; serverSequence: number }> {
  await assertContactExists(ctx, contactId);

  await deleteContactAvatarFile(ctx.user.id, contactId);
  const { serverSequence, txid } = await setAvatarFlagAndEmit(ctx, contactId, false);

  return { data: { success: true }, serverSequence, txid };
}
