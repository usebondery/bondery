import { detachPromise } from "@bondery/helpers/async";
import type { Group } from "@bondery/schemas";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildGroupRowChange } from "../../lib/sync/build-changes.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { maybeCaptureActivation } from "../../services/analytics/maybe-capture-activation.js";
import { type DomainContext, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { toGroupDto, toSyncRow } from "../_shared/prisma-helpers.js";
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
  const { user } = ctx;
  const db = domainDb(ctx);

  try {
    const row = await db.group.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        color: input.color.trim() || null,
        emoji: input.emoji.trim() || null,
        label: input.label.trim(),
        userId: user.id,
      },
    });

    const group = toGroupDto(row);
    const syncRow = toSyncRow(row as unknown as Record<string, unknown>);
    const txid = await captureCurrentSyncTxid(domainDb(ctx));
    const serverSequence =
      (await emitSyncBatch(
        user.id,
        [buildGroupRowChange(syncRow)],
        syncEmitMetaFromContext(ctx),
      )) ?? 0;

    detachPromise(maybeCaptureActivation(ctx, "first_group"));

    return { data: { group }, serverSequence, txid };
  } catch (error) {
    throw internal("group_failed", error instanceof Error ? error.message : "group_failed");
  }
}
