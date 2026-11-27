import type { PrismaClient } from "@bondery/db";

/** Interactive transaction limits in milliseconds. Prisma defaults are 2000 and 5000. */
export interface TransactionLimits {
  maxWaitMs?: number;
  timeoutMs?: number;
}

/**
 * Run `fn` on one transaction. On the root client this opens a transaction. On a Prisma
 * interactive-transaction client, `$transaction` joins the running transaction (same connection
 * and txid, checked against Postgres on 2026-11-27), so `fn` runs inside the caller's
 * transaction. A test fake without `$transaction` runs `fn` directly. The callback type stays
 * `PrismaClient` because a transaction client only lacks lifecycle methods. `limits` apply only
 * when this call opens the transaction.
 */
export async function runInTransaction<T>(
  db: PrismaClient,
  fn: (tx: PrismaClient) => Promise<T>,
  limits?: TransactionLimits,
): Promise<T> {
  if (typeof db.$transaction !== "function") {
    return fn(db);
  }
  return db.$transaction((tx) => fn(tx as unknown as PrismaClient), {
    ...(limits?.maxWaitMs === undefined ? {} : { maxWait: limits.maxWaitMs }),
    ...(limits?.timeoutMs === undefined ? {} : { timeout: limits.timeoutMs }),
  });
}
