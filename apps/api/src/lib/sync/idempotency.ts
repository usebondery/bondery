import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@bondery/db";
import type { SyncMutation } from "@bondery/schemas/sync";
import { allocateSyncServerSequence } from "../data/sync-txid.js";

export function hashSyncMutationPayload(mutation: SyncMutation): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        entityId: "entityId" in mutation ? mutation.entityId : undefined,
        payload: mutation.payload,
        type: mutation.type,
      }),
    )
    .digest("hex");
}

export interface StoredSyncReceipt {
  mutation_type: string;
  payload_hash: string;
  result: unknown;
  server_sequence: number;
}

export async function findSyncReceipt(
  db: PrismaClient,
  userId: string,
  mutationId: string,
): Promise<StoredSyncReceipt | null> {
  const receipt = await db.syncMutationReceipt.findUnique({
    select: {
      mutationType: true,
      payloadHash: true,
      result: true,
      serverSequence: true,
    },
    where: {
      userId_clientMutationId: {
        clientMutationId: mutationId,
        userId,
      },
    },
  });

  if (!receipt) {
    return null;
  }

  return {
    mutation_type: receipt.mutationType,
    payload_hash: receipt.payloadHash,
    result: receipt.result,
    server_sequence: Number(receipt.serverSequence),
  };
}

export async function storeSyncReceipt(
  db: PrismaClient,
  input: {
    userId: string;
    mutationId: string;
    mutationType: string;
    payloadHash: string;
    serverSequence: number;
    result: unknown;
  },
): Promise<void> {
  await db.syncMutationReceipt.create({
    data: {
      clientMutationId: input.mutationId,
      mutationType: input.mutationType,
      payloadHash: input.payloadHash,
      result: input.result as Prisma.InputJsonValue,
      serverSequence: BigInt(input.serverSequence),
      userId: input.userId,
    },
  });
}

export async function allocateServerSequences(
  db: PrismaClient,
  userId: string,
  count: number,
): Promise<number> {
  return allocateSyncServerSequence(userId, count, db);
}

export async function getLastServerSequence(db: PrismaClient, userId: string): Promise<number> {
  return (await getSyncSequenceState(db, userId)).lastSequence;
}

/**
 * The head of a user's sync log and the lowest cursor a client may pull from.
 * A user with no row has an empty log and no floor.
 */
export async function getSyncSequenceState(
  db: PrismaClient,
  userId: string,
): Promise<{ bootstrapFloor: number; lastSequence: number }> {
  const row = await db.syncUserSequence.findUnique({
    select: { bootstrapFloor: true, lastSequence: true },
    where: { userId },
  });

  return {
    bootstrapFloor: row ? Number(row.bootstrapFloor) : 0,
    lastSequence: row ? Number(row.lastSequence) : 0,
  };
}
