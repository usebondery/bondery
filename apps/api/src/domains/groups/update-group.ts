import type { Group } from "@bondery/schemas";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildGroupRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { toGroupDto, toSyncRow } from "../_shared/prisma-helpers.js";
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
  const { user } = ctx;
  const db = domainDb(ctx);

  const data: { color?: string | null; emoji?: string | null; label?: string } = {};
  if (input.label !== undefined) {
    data.label = input.label.trim();
  }
  if (input.emoji !== undefined) {
    data.emoji = input.emoji.trim() || null;
  }
  if (input.color !== undefined) {
    data.color = input.color.trim() || null;
  }

  if (Object.keys(data).length === 0) {
    const existing = await db.group.findFirst({ where: { id: groupId, userId: user.id } });
    if (!existing) {
      throw new DomainError("Group not found", 404, "group_not_found");
    }
    const group = toGroupDto(existing);
    const txid = await captureCurrentSyncTxid(domainDb(ctx));
    return { data: { group }, serverSequence: 0, txid };
  }

  try {
    const updated = await db.group.updateMany({
      data,
      where: { id: groupId, userId: user.id },
    });

    if (updated.count === 0) {
      throw new DomainError("Group not found", 404, "group_not_found");
    }

    const row = await db.group.findFirst({ where: { id: groupId, userId: user.id } });
    if (!row) {
      throw new DomainError("Group not found", 404, "group_not_found");
    }

    const group = toGroupDto(row);
    const syncRow = toSyncRow(row as unknown as Record<string, unknown>);
    const txid = await captureCurrentSyncTxid(domainDb(ctx));
    const serverSequence =
      (await emitSyncBatch(
        user.id,
        [buildGroupRowChange(syncRow)],
        syncEmitMetaFromContext(ctx),
      )) ?? 0;
    return { data: { group }, serverSequence, txid };
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    throw internal("group_failed", error instanceof Error ? error.message : "group_failed");
  }
}
