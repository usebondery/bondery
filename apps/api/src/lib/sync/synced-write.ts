import { type PrismaClient, prisma } from "@bondery/db";
import type { SyncChange, SyncEmitMeta, SyncTableKey } from "@bondery/schemas/sync";
import { fetchSyncTableRowsByIds } from "../data/prisma-sync.js";
import { notifySyncBatch, writeSyncChunks } from "./emit-change.js";
import {
  canDeferSyncWake,
  deferSyncWake,
  isTransactionClient,
  registerPendingWakes,
} from "./pending-wakes.js";
import { runInTransaction, type TransactionLimits } from "./run-in-transaction.js";
import { SYNC_TABLE_KEYS } from "./sync-tables.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const READ_BACK_CHUNK_SIZE = 1000;

type WrittenBatch = { changes: SyncChange[]; serverSequence: number };

class SyncedWriteRecorder implements SyncedWrite {
  readonly touched = new Map<SyncTableKey, Set<string>>();
  readonly removed = new Map<SyncTableKey, Set<string>>();
  readonly explicit: SyncChange[] = [];

  readonly db: PrismaClient;
  readonly userId: string;

  constructor(db: PrismaClient, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  touch(table: SyncTableKey, ids: Iterable<string>): void {
    const touched = this.touched.get(table) ?? new Set<string>();
    const removed = this.removed.get(table);
    for (const id of ids) {
      touched.add(id);
      removed?.delete(id);
    }
    this.touched.set(table, touched);
  }

  remove(table: SyncTableKey, ids: Iterable<string>): void {
    const removed = this.removed.get(table) ?? new Set<string>();
    const touched = this.touched.get(table);
    for (const id of ids) {
      removed.add(id);
      touched?.delete(id);
    }
    this.removed.set(table, removed);
  }

  record(changes: SyncChange[]): void {
    this.explicit.push(...changes);
  }

  /**
   * Build the change list from the final state inside the transaction. Reading after every
   * write means the log carries what the bootstrap would return, including values that raw SQL
   * or a database trigger set. Tables go in `SYNC_TABLE_KEYS` order, which lists parents first.
   */
  async resolveChanges(): Promise<SyncChange[]> {
    const upserts: SyncChange[] = [];
    const deletes: SyncChange[] = [];

    for (const table of SYNC_TABLE_KEYS) {
      const ids = [...(this.touched.get(table) ?? [])];
      for (let index = 0; index < ids.length; index += READ_BACK_CHUNK_SIZE) {
        const chunk = ids.slice(index, index + READ_BACK_CHUNK_SIZE);
        const rows = await fetchSyncTableRowsByIds(this.db, table, this.userId, {
          column: "id",
          values: chunk,
        });
        const found = new Set<string>();
        for (const row of rows) {
          const id = String(row["id"]);
          found.add(id);
          upserts.push({ entityId: id, operation: "update", table, value: row });
        }
        for (const id of chunk) {
          if (!found.has(id)) {
            deletes.push({ entityId: id, operation: "delete", table, value: null });
          }
        }
      }

      for (const id of this.removed.get(table) ?? []) {
        deletes.push({ entityId: id, operation: "delete", table, value: null });
      }
    }

    return [...upserts, ...this.explicit, ...deletes];
  }
}

async function writeAndRecord<T>(
  tx: PrismaClient,
  userId: string,
  fn: (sw: SyncedWrite) => Promise<T>,
  onBatch: (batch: WrittenBatch) => void,
): Promise<SyncedWriteResult<T>> {
  const recorder = new SyncedWriteRecorder(tx, userId);
  const value = await fn(recorder);
  const changes = await recorder.resolveChanges();
  const batches = await writeSyncChunks(tx, userId, changes);
  for (const batch of batches) {
    onBatch(batch);
  }
  return { serverSequence: batches.at(-1)?.serverSequence ?? null, value };
}

/** What `withSyncedWrite` needs from a domain context. `DomainContext` fits this shape. */
export interface SyncedWriteContext {
  /** Root Prisma client. Defaults to the shared client. */
  db?: PrismaClient;
  user: { id: string };
  wakeMeta?: SyncEmitMeta;
}

/** The handle that `withSyncedWrite` gives to its callback. */
export interface SyncedWrite {
  /** The transaction client. Run every write for this operation on it. */
  readonly db: PrismaClient;
  /** Record fully formed changes. Use `touch` and `remove` unless the row is not readable. */
  record: (changes: SyncChange[]) => void;
  /** Record that rows of `table` were deleted. */
  remove: (table: SyncTableKey, ids: Iterable<string>) => void;
  /**
   * Record that rows of `table` were created or changed. At commit, the rows are read back
   * with the bootstrap serializer and emitted as `update` changes. A touched id that no longer
   * exists is emitted as a `delete`.
   */
  touch: (table: SyncTableKey, ids: Iterable<string>) => void;
  readonly userId: string;
}

export interface SyncedWriteOptions extends TransactionLimits {
  /** Transaction timeout in milliseconds. Default 15 s. Bulk imports raise it. */
  timeoutMs?: number;
}

/** The value of `fn` and the last server sequence written (null when nothing was emitted). */
export interface SyncedWriteResult<T> {
  serverSequence: number | null;
  value: T;
}

/**
 * Run a write that touches mobile-synced tables so the sync log cannot miss it.
 *
 * `fn` runs in one transaction on `sw.db`. It records what it changed with `sw.touch`,
 * `sw.remove` or `sw.record`. After `fn` returns, the helper reads the touched rows back and
 * writes them to `sync_change_log` as the last statements of the transaction. The per-user
 * `sync_user_sequence` row lock therefore lasts only until the commit that follows. The wake
 * bus is notified after the commit, never before it.
 *
 * Rules for `fn`:
 * - Do slow external I/O first (object storage, HTTP fetches, geocoding), then call this
 *   function. A transaction must not wait on another service.
 * - Write only through `sw.db`. A write on the root client is outside the transaction.
 * - A failed statement aborts the whole transaction. Do not catch a database error and carry
 *   on, because every later statement would fail too.
 *
 * When `ctx.db` is the client of an outer `withSyncedWrite`, the work joins that transaction and
 * the outer call notifies after its commit. Do not pass a `prisma.$transaction` client: it looks
 * like the root client, so the wake would fire before the outer commit.
 */
export async function withSyncedWrite<T>(
  ctx: SyncedWriteContext,
  fn: (sw: SyncedWrite) => Promise<T>,
  options?: SyncedWriteOptions,
): Promise<T> {
  return (await withSyncedWriteResult(ctx, fn, options)).value;
}

/** Like `withSyncedWrite`, and also returns the last server sequence it wrote. */
export async function withSyncedWriteResult<T>(
  ctx: SyncedWriteContext,
  fn: (sw: SyncedWrite) => Promise<T>,
  options?: SyncedWriteOptions,
): Promise<SyncedWriteResult<T>> {
  const root = ctx.db ?? prisma;
  const userId = ctx.user.id;
  const meta: SyncEmitMeta | undefined = ctx.wakeMeta?.sourceDeviceId
    ? { sourceDeviceId: ctx.wakeMeta.sourceDeviceId }
    : undefined;

  if (isTransactionClient(root)) {
    if (!canDeferSyncWake(root)) {
      throw new Error(
        "withSyncedWrite needs the root client or a transaction opened by withSyncedWrite",
      );
    }
    return writeAndRecord(root, userId, fn, (batch) => {
      deferSyncWake(root, () => notifySyncBatch(userId, batch.serverSequence, batch.changes, meta));
    });
  }

  const pendingWakes: (() => void)[] = [];
  const result = await runInTransaction(
    root,
    async (tx) => {
      const queue = registerPendingWakes(tx);
      const written = await writeAndRecord(tx, userId, fn, (batch) => {
        queue.push(() => notifySyncBatch(userId, batch.serverSequence, batch.changes, meta));
      });
      pendingWakes.push(...queue);
      return written;
    },
    { ...options, timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS },
  );

  for (const notify of pendingWakes) {
    notify();
  }
  return result;
}
