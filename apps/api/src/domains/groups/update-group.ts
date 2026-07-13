import type { Group, TablesUpdate } from "@bondery/schemas";
import { GROUP_SELECT } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildGroupRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export interface UpdateGroupInput {
  color?: string;
  emoji?: string;
  label?: string;
}

export async function updateGroup(
  ctx: DomainContext,
  groupId: string,
  input: UpdateGroupInput,
): Promise<{ data: { group: Group }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const updates: TablesUpdate<"groups"> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) {
    updates.label = input.label.trim();
  }
  if (input.emoji !== undefined) {
    updates.emoji = input.emoji.trim();
  }
  if (input.color !== undefined) {
    updates.color = input.color.trim();
  }

  const { data: group, error } = await client
    .from("groups")
    .update(updates)
    .eq("id", groupId)
    .eq("user_id", user.id)
    .select(GROUP_SELECT)
    .single();

  if (error) {
    throw internal("group_failed", error.message);
  }

  if (!group) {
    throw new DomainError("Group not found", 404, "group_not_found");
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildGroupRowChange(group as Record<string, unknown>)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { group: group as Group }, serverSequence, txid };
}
