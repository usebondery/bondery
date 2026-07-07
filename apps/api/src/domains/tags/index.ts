import type { Tag, TablesInsert, TablesUpdate } from "@bondery/schemas";
import { TAG_SELECT } from "../../lib/queries.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";
import { DomainError, syncEmitMetaFromContext, type DomainContext } from "../_shared/context.js";
import { buildTagDeleteChange, buildTagRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";

const TAG_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

async function pickNextColor(client: DomainContext["client"], userId: string): Promise<string> {
  const { count } = await client
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return TAG_COLORS[(count || 0) % TAG_COLORS.length];
}

export interface CreateTagInput {
  id?: string;
  label: string;
  color?: string;
}

export interface UpdateTagInput {
  label?: string;
  color?: string;
}

export async function createTag(
  ctx: DomainContext,
  input: CreateTagInput,
): Promise<{ data: { tag: Tag }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const color = input.color ?? (await pickNextColor(client, user.id));

  const insertData: TablesInsert<"tags"> = {
    user_id: user.id,
    label: input.label.trim(),
    color,
  };

  if (input.id) insertData.id = input.id;

  const { data: newTag, error } = await client
    .from("tags")
    .insert(insertData)
    .select(TAG_SELECT)
    .single();

  if (error) {
    throw new DomainError(error.message, 500);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(user.id, [buildTagRowChange(newTag as Record<string, unknown>)], syncEmitMetaFromContext(ctx))) ?? 0;
  return { data: { tag: newTag as Tag }, txid, serverSequence };
}

export async function updateTag(
  ctx: DomainContext,
  tagId: string,
  input: UpdateTagInput,
): Promise<{ data: { tag: Tag }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const updates: TablesUpdate<"tags"> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) updates.label = input.label.trim();
  if (input.color !== undefined) updates.color = input.color;

  const { data: tag, error } = await client
    .from("tags")
    .update(updates)
    .eq("id", tagId)
    .eq("user_id", user.id)
    .select(TAG_SELECT)
    .single();

  if (error) {
    throw new DomainError(error.message, 500);
  }

  if (!tag) {
    throw new DomainError("Tag not found", 404);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(user.id, [buildTagRowChange(tag as Record<string, unknown>)], syncEmitMetaFromContext(ctx))) ?? 0;
  return { data: { tag: tag as Tag }, txid, serverSequence };
}

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
    throw new DomainError("Tag not found", 404);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence = (await emitSyncBatch(user.id, [buildTagDeleteChange(tagId)], syncEmitMetaFromContext(ctx))) ?? 0;
  return { data: { deletedId: tagId }, txid, serverSequence };
}
