import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildPeopleGroupsChanges } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function addGroupMembers(
  ctx: DomainContext,
  groupId: string,
  personIds: string[],
): Promise<{
  data: { addedCount: number; skippedCount: number };
  txid: string;
  serverSequence: number;
}> {
  const { client, user } = ctx;

  const { data: group, error: groupError } = await client
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (groupError) {
    throw internal("group_failed", groupError.message);
  }

  if (!group) {
    throw new DomainError("Group not found", 404, "group_not_found");
  }

  const { data: existingRows, error: lookupError } = await client
    .from("people_groups")
    .select("person_id")
    .eq("group_id", groupId)
    .in("person_id", personIds);

  if (lookupError) {
    throw internal("group_failed", lookupError.message);
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.person_id));
  const newPersonIds = personIds.filter((id) => !existingIds.has(id));
  const skippedCount = existingIds.size;

  if (newPersonIds.length > 0) {
    const memberships = newPersonIds.map((personId) => ({
      group_id: groupId,
      person_id: personId,
      user_id: user.id,
    }));

    const { error } = await client.from("people_groups").upsert(memberships, {
      ignoreDuplicates: true,
      onConflict: "person_id,group_id",
    });

    if (error) {
      throw internal("group_failed", error.message);
    }
  }

  const txid = await captureCurrentSyncTxid(client);
  const changes = await buildPeopleGroupsChanges(client, user.id, groupId, newPersonIds, "insert");
  const serverSequence = (await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;
  return {
    data: { addedCount: newPersonIds.length, skippedCount },
    serverSequence,
    txid,
  };
}

export async function removeGroupMembers(
  ctx: DomainContext,
  groupId: string,
  personIds: string[],
): Promise<{ data: { removedCount: number }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const changes = await buildPeopleGroupsChanges(client, user.id, groupId, personIds, "delete");

  const { error } = await client
    .from("people_groups")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .in("person_id", personIds);

  if (error) {
    throw internal("group_failed", error.message);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence = (await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;
  return { data: { removedCount: personIds.length }, serverSequence, txid };
}
