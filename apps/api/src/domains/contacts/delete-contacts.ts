import {
  collectLinkedInLogoIds,
  removeOrphanedLinkedInLogos,
} from "../../lib/contacts/delete-cleanup.js";
import { deleteOrphanedInteractionsForDeletedContacts } from "../../lib/contacts/delete-orphaned-interactions.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildPeopleDeleteChange } from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function deleteContacts(
  ctx: DomainContext,
  personIds: string[],
): Promise<{ data: { deletedCount: number }; txid: string; serverSequence: number }> {
  const { client, user, log } = ctx;

  if (personIds.length === 0) {
    return { data: { deletedCount: 0 }, serverSequence: 0, txid: "" };
  }

  const uniqueIds = [...new Set(personIds)];

  try {
    await deleteOrphanedInteractionsForDeletedContacts(client, user.id, uniqueIds, {
      includeParticipantlessInteractions: true,
    });
  } catch (cleanupError) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.message
        : "Failed to clean up interactions for deleted contacts";
    throw internal("contact_failed", message);
  }

  const candidateLogoIds = await collectLinkedInLogoIds(client, user.id, uniqueIds);

  const { error } = await client.from("people").delete().eq("user_id", user.id).in("id", uniqueIds);

  if (error) {
    throw internal("contact_failed", error.message);
  }

  const avatarPaths = uniqueIds.map((id) => `${user.id}/${id}.jpg`);
  await client.storage.from("avatars").remove(avatarPaths);

  try {
    await removeOrphanedLinkedInLogos(client, user.id, candidateLogoIds);
  } catch (logoCleanupError) {
    log?.warn({ logoCleanupError }, "[deleteContacts] Failed to clean up orphaned LinkedIn logos");
  }

  const changes = uniqueIds.map((id) => buildPeopleDeleteChange(id));
  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { data: { deletedCount: uniqueIds.length }, serverSequence, txid };
}
