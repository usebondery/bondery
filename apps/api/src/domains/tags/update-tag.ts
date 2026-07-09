import type { TablesUpdate, Tag } from "@bondery/schemas";
import { TAG_SELECT } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildTagRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export interface UpdateTagInput {
  color?: string;
  label?: string;
}

export async function updateTag(
  ctx: DomainContext,
  tagId: string,
  input: UpdateTagInput,
): Promise<{ data: { tag: Tag }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const updates: TablesUpdate<"tags"> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) {
    updates.label = input.label.trim();
  }
  if (input.color !== undefined) {
    updates.color = input.color;
  }

  const { data: tag, error } = await client
    .from("tags")
    .update(updates)
    .eq("id", tagId)
    .eq("user_id", user.id)
    .select(TAG_SELECT)
    .single();

  if (error) {
    throw internal("tag_failed", error.message);
  }

  if (!tag) {
    throw new DomainError("Tag not found", 404, "tag_not_found");
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildTagRowChange(tag as Record<string, unknown>)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { tag: tag as Tag }, serverSequence, txid };
}
