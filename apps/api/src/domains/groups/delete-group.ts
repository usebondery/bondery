import { buildGroupDeleteChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export async function deleteGroup(
  ctx: DomainContext,
  groupId: string,
): Promise<{ data: { deletedId: string }; txid: string; serverSequence: number }> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const deleted = await db.group.deleteMany({
    where: { id: groupId, userId: user.id },
  });

  if (deleted.count === 0) {
    throw new DomainError("Group not found", 404, "group_not_found");
  }

  const txid = await captureCurrentSyncTxid(domainDb(ctx));
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildGroupDeleteChange(groupId)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { deletedId: groupId }, serverSequence, txid };
}
