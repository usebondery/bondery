import {
  deleteContactAvatarAndClearFlag,
  uploadContactAvatarAndSetFlag,
} from "../../lib/contacts/avatar-storage.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";
import { buildPeopleRowChange } from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

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

  try {
    await uploadContactAvatarAndSetFlag(db, user.id, contactId, buffer, mimeType);
  } catch {
    throw internal("contact_failed_to_upload_photo");
  }

  const peopleChange = await buildPeopleRowChange(user.id, contactId, db);
  const changes = peopleChange ? [peopleChange] : [];
  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

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

  const { user } = ctx;
  const db = domainDb(ctx);
  await deleteContactAvatarAndClearFlag(db, user.id, contactId);

  const peopleChange = await buildPeopleRowChange(user.id, contactId, db);
  const changes = peopleChange ? [peopleChange] : [];
  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { data: { success: true }, serverSequence, txid };
}
