import { deleteContactAvatarFile } from "../../lib/contacts/avatar-storage.js";
import {
  collectLinkedInLogoIds,
  removeOrphanedLinkedInLogos,
} from "../../lib/contacts/delete-cleanup.js";
import { deleteOrphanedInteractionsForDeletedContacts } from "../../lib/contacts/delete-orphaned-interactions.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildPeopleDeleteChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function deleteContact(
  ctx: DomainContext,
  personId: string,
): Promise<{ data: { deletedId: string }; txid: string; serverSequence: number }> {
  const { user, log } = ctx;
  const db = domainDb(ctx);

  const contactCheck = await db.people.findFirst({
    select: { id: true, myself: true },
    where: { id: personId, userId: user.id },
  });

  if (!contactCheck) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  if (contactCheck.myself) {
    throw new DomainError(
      "Cannot delete your own contact card",
      403,
      "contact_delete_self_forbidden",
    );
  }

  try {
    await deleteOrphanedInteractionsForDeletedContacts(db, user.id, [personId]);
  } catch (cleanupError) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.message
        : "Failed to clean up interactions for deleted contact";
    throw internal("contact_failed", message);
  }

  const candidateLogoIds = await collectLinkedInLogoIds(db, user.id, [personId]);

  const deleted = await db.people.deleteMany({
    where: { id: personId, userId: user.id },
  });

  if (deleted.count === 0) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  await deleteContactAvatarFile(user.id, personId);

  try {
    await removeOrphanedLinkedInLogos(db, user.id, candidateLogoIds);
  } catch (logoCleanupError) {
    log?.warn({ logoCleanupError }, "[deleteContact] Failed to clean up orphaned LinkedIn logos");
  }

  const txid = await captureCurrentSyncTxid(domainDb(ctx));
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildPeopleDeleteChange(personId)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { deletedId: personId }, serverSequence, txid };
}
