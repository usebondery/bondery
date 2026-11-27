import type { PrismaClient } from "@bondery/db";
import { bumpPersonSyncTxid, getCurrentSyncTxid } from "../../lib/data/sync-txid.js";

export async function capturePersonSyncTxid(
  db: PrismaClient,
  personId: string,
  userId: string,
): Promise<string> {
  return bumpPersonSyncTxid(db, personId, userId);
}

export async function captureCurrentSyncTxid(db: PrismaClient): Promise<string> {
  return getCurrentSyncTxid(db);
}

export async function withPersonTxid<T extends { personId: string }>(
  db: PrismaClient,
  userId: string,
  fn: () => Promise<T>,
): Promise<{ data: T; txid: string }> {
  const data = await fn();
  const txid = await capturePersonSyncTxid(db, data.personId, userId);
  return { data, txid };
}

export async function withTxid<T>(
  db: PrismaClient,
  fn: () => Promise<T>,
): Promise<{ data: T; txid: string }> {
  const data = await fn();
  const txid = await captureCurrentSyncTxid(db);
  return { data, txid };
}
