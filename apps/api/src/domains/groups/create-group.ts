import type { Group, TablesInsert } from "@bondery/schemas";
import { GROUP_SELECT } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildGroupRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export interface CreateGroupInput {
  color: string;
  emoji: string;
  id?: string;
  label: string;
}

export async function createGroup(
  ctx: DomainContext,
  input: CreateGroupInput,
): Promise<{ data: { group: Group }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const insertData: TablesInsert<"groups"> = {
    color: input.color.trim() || null,
    emoji: input.emoji.trim() || null,
    label: input.label.trim(),
    user_id: user.id,
  };

  if (input.id) {
    insertData.id = input.id;
  }

  const { data: newGroup, error } = await client
    .from("groups")
    .insert(insertData)
    .select(GROUP_SELECT)
    .single();

  if (error) {
    throw internal("group_failed", error.message);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildGroupRowChange(newGroup as Record<string, unknown>)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { group: newGroup as Group }, serverSequence, txid };
}
