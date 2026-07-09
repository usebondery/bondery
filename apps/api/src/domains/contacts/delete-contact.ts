import {
  collectLinkedInLogoIds,
  removeOrphanedLinkedInLogos,
} from "../../lib/contacts/delete-cleanup.js";
import { deleteOrphanedInteractionsForDeletedContacts } from "../../lib/contacts/delete-orphaned-interactions.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildPeopleDeleteChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function deleteContact(
  ctx: DomainContext,
  personId: string,
): Promise<{ data: { deletedId: string }; txid: string; serverSequence: number }> {
  const { client, user, log } = ctx;

  const { data: contactCheck } = await client
    .from("people")
    .select("id, myself")
    .eq("id", personId)
    .eq("user_id", user.id)
    .single();

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
    await deleteOrphanedInteractionsForDeletedContacts(client, user.id, [personId]);
  } catch (cleanupError) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.message
        : "Failed to clean up interactions for deleted contact";
    throw internal("contact_failed", message);
  }

  const candidateLogoIds = await collectLinkedInLogoIds(client, user.id, [personId]);

  const { data: deletedContact, error } = await client
    .from("people")
    .delete()
    .eq("id", personId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !deletedContact) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  await client.storage.from("avatars").remove([`${user.id}/${personId}.jpg`]);

  try {
    await removeOrphanedLinkedInLogos(client, user.id, candidateLogoIds);
  } catch (logoCleanupError) {
    log?.warn({ logoCleanupError }, "[deleteContact] Failed to clean up orphaned LinkedIn logos");
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildPeopleDeleteChange(personId)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { deletedId: personId }, serverSequence, txid };
}
