import type { TablesInsert, Tag } from "@bondery/schemas";
import { TAG_SELECT } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildTagRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

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
  color?: string;
  id?: string;
  label: string;
}

export async function createTag(
  ctx: DomainContext,
  input: CreateTagInput,
): Promise<{ data: { tag: Tag }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const color = input.color ?? (await pickNextColor(client, user.id));

  const insertData: TablesInsert<"tags"> = {
    color,
    label: input.label.trim(),
    user_id: user.id,
  };

  if (input.id) {
    insertData.id = input.id;
  }

  const { data: newTag, error } = await client
    .from("tags")
    .insert(insertData)
    .select(TAG_SELECT)
    .single();

  if (error) {
    throw internal("tag_failed", error.message);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(
      user.id,
      [buildTagRowChange(newTag as Record<string, unknown>)],
      syncEmitMetaFromContext(ctx),
    )) ?? 0;
  return { data: { tag: newTag as Tag }, serverSequence, txid };
}
