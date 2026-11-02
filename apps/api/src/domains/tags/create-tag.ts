import type { PrismaClient } from "@bondery/db";
import type { Tag } from "@bondery/schemas";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildTagRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { isUniqueViolation, toSyncRow, toTagDto } from "../_shared/prisma-helpers.js";
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

async function pickNextColor(db: PrismaClient, userId: string): Promise<string> {
  const count = await db.tag.count({ where: { userId } });
  return TAG_COLORS[count % TAG_COLORS.length];
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
  const { user } = ctx;
  const db = domainDb(ctx);

  const color = input.color ?? (await pickNextColor(db, user.id));

  try {
    const row = await db.tag.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        color,
        label: input.label.trim(),
        userId: user.id,
      },
    });

    const tag = toTagDto(row);
    const syncRow = toSyncRow(row as unknown as Record<string, unknown>);
    const txid = await captureCurrentSyncTxid();
    const serverSequence =
      (await emitSyncBatch(user.id, [buildTagRowChange(syncRow)], syncEmitMetaFromContext(ctx))) ??
      0;
    return { data: { tag }, serverSequence, txid };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DomainError("Tag label already exists", 409, "tag_label_exists");
    }
    throw internal("tag_failed", error instanceof Error ? error.message : "tag_failed");
  }
}
