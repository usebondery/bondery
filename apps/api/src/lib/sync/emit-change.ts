import { type Prisma, type PrismaClient, prisma } from "@bondery/db";
import { detachPromise } from "@bondery/helpers/async";
import type { SyncChange, SyncEmitMeta, SyncTableKey, SyncWakeEvent } from "@bondery/schemas/sync";
import { allocateServerSequences } from "./idempotency.js";
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

  const serverSequence = await allocateServerSequences(db, userId, 1);

  await db.syncChangeLog.createMany({
    data: changes.map((change, changeIndex) => ({
      changeIndex,
      entityId: change.entityId,
      operation: change.operation,
      rowData: (change.value ?? null) as Prisma.InputJsonValue,
      serverSequence: BigInt(serverSequence),
      tableName: change.table,
      userId,
    })),
  });

  if (getSyncWakeRuntime()) {
    detachPromise(notifySyncWake(userId, syncWakeEventFromChanges(serverSequence, changes, meta)));
  }

  return serverSequence;
}
