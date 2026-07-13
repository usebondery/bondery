import { buildGroupDeleteChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function deleteGroup(
  ctx: DomainContext,
  groupId: string,
): Promise<{ data: { deletedId: string }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { data, error } = await client
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    throw new DomainError("Group not found", 404, "group_not_found");
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildGroupDeleteChange(groupId)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { deletedId: groupId }, serverSequence, txid };
}
