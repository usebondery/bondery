import type { PrismaClient } from "@bondery/db";

/**
 * Wake notifications that wait for a transaction to commit, keyed by the transaction client.
 * `withSyncedWrite` registers its client here and flushes after the commit. A client that is
 * not registered belongs to some other transaction owner, who must notify by hand.
 */
const pendingByTransaction = new WeakMap<object, (() => void)[]>();

/**
 * True when `db` is a transaction client that this module can reason about: one that
 * `withSyncedWrite` opened, or a stand-in without `$transaction` (unit-test fakes).
 *
 * A real Prisma transaction client still has a `$transaction` function, and calling it joins the
 * running transaction. So only `withSyncedWrite` can tell its own clients apart. Open
 * transactions for synced writes with `withSyncedWrite`, not with `prisma.$transaction`.
 */
export function isTransactionClient(db: PrismaClient): boolean {
  return pendingByTransaction.has(db) || typeof db.$transaction !== "function";
}

/** Start collecting wake callbacks for `tx`. Returns the list to flush after the commit. */
export function registerPendingWakes(tx: PrismaClient): (() => void)[] {
  const pending: (() => void)[] = [];
  pendingByTransaction.set(tx, pending);
  return pending;
}

/** True when `tx` was opened by `withSyncedWrite`, so a wake can wait for its commit. */
export function canDeferSyncWake(tx: PrismaClient): boolean {
  return pendingByTransaction.has(tx);
}

/** Queue `notify` for after the commit of `tx`. Returns false when `tx` is not registered. */
export function deferSyncWake(tx: PrismaClient, notify: () => void): boolean {
  const pending = pendingByTransaction.get(tx);
  if (!pending) {
    return false;
  }
  pending.push(notify);
  return true;
}
