import { buildTagDeleteChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function deleteTag(
  ctx: DomainContext,
  tagId: string,
): Promise<{ data: { deletedId: string }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { data, error } = await client
    .from("tags")
    .delete()
    .eq("id", tagId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    throw new DomainError("Tag not found", 404, "tag_not_found");
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(user.id, [buildTagDeleteChange(tagId)], syncEmitMetaFromContext(ctx))) ??
    0;
  return { data: { deletedId: tagId }, serverSequence, txid };
}
