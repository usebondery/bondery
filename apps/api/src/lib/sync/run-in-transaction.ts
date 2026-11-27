import type { PrismaClient } from "@bondery/db";

/**
 * Run `fn` on one transaction: reuse `db` when it is already an interactive-transaction client
 * (Prisma removes `$transaction` from those), otherwise open a new transaction on the root client.
 * The callback type stays `PrismaClient` because a transaction client only lacks lifecycle methods.
 */
export async function runInTransaction<T>(
  db: PrismaClient,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  if (typeof db.$transaction !== "function") {
    return fn(db);
  }
  return db.$transaction((tx) => fn(tx as unknown as PrismaClient));
}
