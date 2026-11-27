import { type Prisma, type PrismaClient, prisma } from "@bondery/db";
import { detachPromise } from "@bondery/helpers/async";
import type { SyncChange, SyncEmitMeta, SyncTableKey, SyncWakeEvent } from "@bondery/schemas/sync";
import { allocateServerSequences } from "./idempotency.js";
import { deferSyncWake, isTransactionClient } from "./pending-wakes.js";
import { getSyncWakeRuntime, notifySyncWake } from "./wake/index.js";

/**
 * Maximum rows one server sequence may hold. `GET /sync/pull` reads at most this many rows per
 * requested sequence (`SYNC_CHANGE_LOG_ROWS_PER_SEQUENCE`), so a bigger batch could be cut in
 * the middle of a page.
 */
const SYNC_BATCH_MAX_CHANGES = 20;

function toLogRow(
  userId: string,
  serverSequence: number,
  changeIndex: number,
  change: SyncChange,
): Prisma.SyncChangeLogCreateManyInput {
  return {
    changeIndex,
    entityId: change.entityId,
    operation: change.operation,
    rowData: (change.value ?? null) as Prisma.InputJsonValue,
    serverSequence: BigInt(serverSequence),
    tableName: change.table,
    userId,
  };
}

/** Rows per `createMany` call when many batches are written at once. */
const LOG_INSERT_CHUNK_SIZE = 2000;

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

/**
 * Reserve one server sequence and insert the change-log rows on `tx`. It never notifies.
 *
 * `tx` must be a transaction client. The sequence row lock lasts until that transaction
 * commits, so sequence order equals commit order for each user. Without the transaction, a later
 * sequence could commit first, a pull could move its cursor past the earlier one, and skip it.
 * The caller notifies the wake bus after the commit with `notifySyncBatch`.
 */
export async function writeSyncBatch(
  tx: PrismaClient,
  userId: string,
  changes: SyncChange[],
): Promise<number> {
  const serverSequence = await allocateServerSequences(tx, userId, 1);
  await tx.syncChangeLog.createMany({
    data: changes.map((change, changeIndex) =>
      toLogRow(userId, serverSequence, changeIndex, change),
    ),
  });
  return serverSequence;
}

/**
 * Write many changes as consecutive sequences of at most `SYNC_BATCH_MAX_CHANGES` rows each.
 * One allocation reserves all sequences. Like `writeSyncBatch`, it needs a transaction client
 * and never notifies. Returns each batch with its sequence, in order.
 */
export async function writeSyncChunks(
  tx: PrismaClient,
  userId: string,
  changes: SyncChange[],
): Promise<{ changes: SyncChange[]; serverSequence: number }[]> {
  if (changes.length === 0) {
    return [];
  }

  const batches: SyncChange[][] = [];
  for (let index = 0; index < changes.length; index += SYNC_BATCH_MAX_CHANGES) {
    batches.push(changes.slice(index, index + SYNC_BATCH_MAX_CHANGES));
  }

  const firstSequence = await allocateServerSequences(tx, userId, batches.length);
  const written = batches.map((batch, batchIndex) => ({
    changes: batch,
    serverSequence: firstSequence + batchIndex,
  }));

  const rows = written.flatMap((batch) =>
    batch.changes.map((change, changeIndex) =>
      toLogRow(userId, batch.serverSequence, changeIndex, change),
    ),
  );
  for (let index = 0; index < rows.length; index += LOG_INSERT_CHUNK_SIZE) {
    await tx.syncChangeLog.createMany({ data: rows.slice(index, index + LOG_INSERT_CHUNK_SIZE) });
  }

  return written;
}

/** Fire the wake event for a committed batch. Call it only after the transaction commits. */
export function notifySyncBatch(
  userId: string,
  serverSequence: number,
  changes: SyncChange[],
  meta?: SyncEmitMeta,
): void {
  if (getSyncWakeRuntime()) {
    detachPromise(notifySyncWake(userId, syncWakeEventFromChanges(serverSequence, changes, meta)));
  }
}

/**
 * Write one batch in its own transaction and notify after the commit.
 *
 * When `db` is the client of a `withSyncedWrite` transaction, the commit belongs to that call:
 * the rows join its transaction and the wake fires after its commit. Open transactions for
 * synced writes with `withSyncedWrite`. A `prisma.$transaction` client looks like the root
 * client, so a wake fired here would come before the outer commit.
 */
export async function emitSyncBatch(
  userId: string,
  changes: SyncChange[],
  meta?: SyncEmitMeta,
  db: PrismaClient = prisma,
): Promise<number | null> {
  if (changes.length === 0) {
    return null;
  }

  if (isTransactionClient(db)) {
    const serverSequence = await writeSyncBatch(db, userId, changes);
    deferSyncWake(db, () => notifySyncBatch(userId, serverSequence, changes, meta));
    return serverSequence;
  }

  const serverSequence = await db.$transaction((tx) =>
    writeSyncBatch(tx as unknown as PrismaClient, userId, changes),
  );
  notifySyncBatch(userId, serverSequence, changes, meta);
  return serverSequence;
}

export { SYNC_BATCH_MAX_CHANGES };
