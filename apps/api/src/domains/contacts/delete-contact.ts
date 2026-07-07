import { deleteOrphanedInteractionsForDeletedContacts } from "../../lib/delete-orphaned-interactions-for-contacts.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";
import { DomainError, syncEmitMetaFromContext, type DomainContext } from "../_shared/context.js";
import { buildPeopleDeleteChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";

async function collectLinkedInLogoIds(
  client: DomainContext["client"],
  userId: string,
  personIds: string[],
): Promise<string[]> {
  if (personIds.length === 0) return [];

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("company_linkedin_id", "is", null),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("school_linkedin_id", "is", null),
  ]);

  const ids = new Set<string>();
  for (const row of workResult.data ?? []) {
    if (row.company_linkedin_id) ids.add(row.company_linkedin_id);
  }
  for (const row of eduResult.data ?? []) {
    if (row.school_linkedin_id) ids.add(row.school_linkedin_id);
  }
  return Array.from(ids);
}

async function removeOrphanedLinkedInLogos(
  client: DomainContext["client"],
  userId: string,
  candidateIds: string[],
): Promise<void> {
  if (candidateIds.length === 0) return;

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("company_linkedin_id", candidateIds),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("school_linkedin_id", candidateIds),
  ]);

  const stillReferenced = new Set<string>();
  for (const row of workResult.data ?? []) {
    if (row.company_linkedin_id) stillReferenced.add(row.company_linkedin_id);
  }
  for (const row of eduResult.data ?? []) {
    if (row.school_linkedin_id) stillReferenced.add(row.school_linkedin_id);
  }

  const orphaned = candidateIds.filter((id) => !stillReferenced.has(id));
  if (orphaned.length === 0) return;

  await client.storage.from("linkedin-logos").remove(orphaned);
}

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
    throw new DomainError("Contact not found", 404);
  }

  if (contactCheck.myself) {
    throw new DomainError("Cannot delete your own contact card", 403);
  }

  try {
    await deleteOrphanedInteractionsForDeletedContacts(client, user.id, [personId]);
  } catch (cleanupError) {
    const message =
      cleanupError instanceof Error
        ? cleanupError.message
        : "Failed to clean up interactions for deleted contact";
    throw new DomainError(message, 500);
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
    throw new DomainError("Contact not found", 404);
  }

  await client.storage.from("avatars").remove([`${user.id}/${personId}.jpg`]);

  try {
    await removeOrphanedLinkedInLogos(client, user.id, candidateLogoIds);
  } catch (logoCleanupError) {
    log?.warn({ logoCleanupError }, "[deleteContact] Failed to clean up orphaned LinkedIn logos");
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(user.id, [buildPeopleDeleteChange(personId)], syncEmitMetaFromContext(ctx))) ?? 0;
  return { data: { deletedId: personId }, txid, serverSequence };
}
