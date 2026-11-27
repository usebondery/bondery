import { type PrismaClient, prisma } from "@bondery/db";

/** Allocate the next sync server sequence block for a user. */
export async function allocateSyncServerSequence(
  userId: string,
  count = 1,
  client: PrismaClient = prisma,
): Promise<number> {
  const rows = await client.$queryRaw<{ allocate_sync_server_sequence: bigint }[]>`
    SELECT allocate_sync_server_sequence(${userId}::uuid, ${count}) AS allocate_sync_server_sequence
  `;
  const value = rows[0]?.allocate_sync_server_sequence;
  if (value === undefined) {
    throw new Error("allocate_sync_server_sequence returned no value");
  }
  return Number(value);
}

/** Postgres transaction id for sync (same transaction as surrounding Prisma writes). */
export async function getCurrentSyncTxid(db: PrismaClient): Promise<string> {
  const rows = await db.$queryRaw<{ txid: string }[]>`
    SELECT get_current_sync_txid()::text AS txid
  `;
  const txid = rows[0]?.txid;
  if (!txid) {
    throw new Error("get_current_sync_txid returned no value");
  }
  return txid;
}

/** Touch `people.updated_at` and return the transaction id for sync. */
export async function bumpPersonSyncTxid(
  db: PrismaClient,
  personId: string,
  userId: string,
): Promise<string> {
  const rows = await db.$queryRaw<{ txid: string }[]>`
    SELECT bump_person_updated_at_for_sync(${personId}::uuid, ${userId}::uuid) AS txid
  `;
  const txid = rows[0]?.txid;
  if (!txid) {
    throw new Error("bump_person_updated_at_for_sync returned no value");
  }
  return txid;
}
