import { deleteContactAvatarFiles } from "../../lib/contacts/avatar-storage.js";
import {
  collectLinkedInLogoIds,
  removeOrphanedLinkedInLogos,
} from "../../lib/contacts/delete-cleanup.js";
import { deleteOrphanedInteractionsForDeletedContacts } from "../../lib/contacts/delete-orphaned-interactions.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildPeopleDeleteChange } from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function deleteContacts(
  ctx: DomainContext,
  personIds: string[],
): Promise<{ data: { deletedCount: number }; txid: string; serverSequence: number }> {
  const { user, log } = ctx;
  const db = domainDb(ctx);

  if (personIds.length === 0) {
    return { data: { deletedCount: 0 }, serverSequence: 0, txid: "" };
  }

  const uniqueIds = [...new Set(personIds)];
  const candidates = await db.people.findMany({
    select: { id: true },
    where: { id: { in: uniqueIds }, myself: false, userId: user.id },
  });
  const candidateIds = candidates.map((row) => row.id);

  if (candidateIds.length === 0) {
    return { data: { deletedCount: 0 }, serverSequence: 0, txid: "" };
  }

  try {
    await deleteOrphanedInteractionsForDeletedContacts(db, user.id, candidateIds, {
      includeParticipantlessInteractions: true,
    });
  } catch (cleanupError) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.message
        : "Failed to clean up interactions for deleted contacts";
    throw internal("contact_failed", message);
  }

  const candidateLogoIds = await collectLinkedInLogoIds(db, user.id, candidateIds);

  let deletedCount = 0;
  try {
    const deleted = await db.people.deleteMany({
      where: { id: { in: candidateIds }, myself: false, userId: user.id },
    });
    deletedCount = deleted.count;
  } catch (error) {
    throw internal("contact_failed", error instanceof Error ? error.message : "contact_failed");
  }

  let deletedIds = candidateIds;
  if (deletedCount !== candidateIds.length) {
    const remaining = await db.people.findMany({
      select: { id: true },
      where: { id: { in: candidateIds }, userId: user.id },
    });
    const remainingIds = new Set(remaining.map((row) => row.id));
    deletedIds = candidateIds.filter((id) => !remainingIds.has(id));
  }

  if (deletedIds.length === 0) {
    return { data: { deletedCount: 0 }, serverSequence: 0, txid: "" };
  }

  await deleteContactAvatarFiles(user.id, deletedIds);

  try {
    await removeOrphanedLinkedInLogos(db, user.id, candidateLogoIds);
  } catch (logoCleanupError) {
    log?.warn({ logoCleanupError }, "[deleteContacts] Failed to clean up orphaned LinkedIn logos");
  }

  const changes = deletedIds.map((id) => buildPeopleDeleteChange(id));
  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { data: { deletedCount }, serverSequence, txid };
}
