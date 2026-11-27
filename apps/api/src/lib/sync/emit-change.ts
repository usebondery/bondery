import { type Prisma, type PrismaClient, prisma } from "@bondery/db";
import { detachPromise } from "@bondery/helpers/async";
import type { SyncChange, SyncEmitMeta, SyncTableKey, SyncWakeEvent } from "@bondery/schemas/sync";
import { allocateServerSequences } from "./idempotency.js";
import { runInTransaction } from "./run-in-transaction.js";
import { getSyncWakeRuntime, notifySyncWake } from "./wake/index.js";

export function syncWakeEventFromChanges(
  serverSequence: number,
  changes: SyncChange[],
  meta?: SyncEmitMeta,
): SyncWakeEvent {
  const affectedTables = [...new Set(changes.map((change) => change.table))] as SyncTableKey[];

  return {
    affectedTables,
    serverSequence,
    ...(meta?.sourceDeviceId ? { sourceDeviceId: meta.sourceDeviceId } : {}),
  };
}

export async function emitSyncBatch(
  userId: string,
  changes: SyncChange[],
  meta?: SyncEmitMeta,
  db: PrismaClient = prisma,
): Promise<number | null> {
  if (changes.length === 0) {
    return null;
  }

  // One transaction keeps the sequence row lock until the rows commit. Without it a later
  // sequence could commit first, a pull could move its cursor past the earlier one, and skip it.
  const serverSequence = await runInTransaction(db, async (tx) => {
    const reserved = await allocateServerSequences(tx, userId, 1);

    await tx.syncChangeLog.createMany({
      data: changes.map((change, changeIndex) => ({
        changeIndex,
        entityId: change.entityId,
        operation: change.operation,
        rowData: (change.value ?? null) as Prisma.InputJsonValue,
        serverSequence: BigInt(reserved),
        tableName: change.table,
        userId,
      })),
    });

    return reserved;
  });

  // Wake only after the commit so listeners never pull before the rows are visible.
  if (getSyncWakeRuntime()) {
    detachPromise(notifySyncWake(userId, syncWakeEventFromChanges(serverSequence, changes, meta)));
  }

  return serverSequence;
}
