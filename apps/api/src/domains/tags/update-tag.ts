import type { Tag } from "@bondery/schemas";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildTagRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { isUniqueViolation, toSyncRow, toTagDto } from "../_shared/prisma-helpers.js";
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
  const { user } = ctx;
  const db = domainDb(ctx);

  const data: { color?: string; label?: string } = {};
  if (input.label !== undefined) {
    data.label = input.label.trim();
  }
  if (input.color !== undefined) {
    data.color = input.color;
  }

  if (Object.keys(data).length === 0) {
    const existing = await db.tag.findFirst({ where: { id: tagId, userId: user.id } });
    if (!existing) {
      throw new DomainError("Tag not found", 404, "tag_not_found");
    }
    const tag = toTagDto(existing);
    const txid = await captureCurrentSyncTxid();
    return { data: { tag }, serverSequence: 0, txid };
  }

  try {
    const updated = await db.tag.updateMany({
      data,
      where: { id: tagId, userId: user.id },
    });

    if (updated.count === 0) {
      throw new DomainError("Tag not found", 404, "tag_not_found");
    }

    const row = await db.tag.findFirst({ where: { id: tagId, userId: user.id } });
    if (!row) {
      throw new DomainError("Tag not found", 404, "tag_not_found");
    }

    const tag = toTagDto(row);
    const syncRow = toSyncRow(row as unknown as Record<string, unknown>);
    const txid = await captureCurrentSyncTxid();
    const serverSequence =
      (await emitSyncBatch(user.id, [buildTagRowChange(syncRow)], syncEmitMetaFromContext(ctx))) ??
      0;
    return { data: { tag }, serverSequence, txid };
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new DomainError("Tag label already exists", 409, "tag_label_exists");
    }
    throw internal("tag_failed", error instanceof Error ? error.message : "tag_failed");
  }
}
