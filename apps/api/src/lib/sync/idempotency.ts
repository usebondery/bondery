import { createHash } from "node:crypto";
import type { SyncMutation } from "@bondery/schemas/sync";
import type { DomainSupabaseClient } from "../../domains/_shared/context.js";

type UntypedAdminClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
        };
        maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    insert(row: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
};

function admin(client: DomainSupabaseClient): UntypedAdminClient {
  return client as unknown as UntypedAdminClient;
}

export function hashSyncMutationPayload(mutation: SyncMutation): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type: mutation.type,
        payload: mutation.payload,
        entityId: "entityId" in mutation ? mutation.entityId : undefined,
      }),
    )
    .digest("hex");
}

export interface StoredSyncReceipt {
  server_sequence: number;
  mutation_type: string;
  payload_hash: string;
  result: unknown;
}

export async function findSyncReceipt(
  client: DomainSupabaseClient,
  userId: string,
  mutationId: string,
): Promise<StoredSyncReceipt | null> {
  const { data, error } = await admin(client)
    .from("sync_mutation_receipts")
    .select("server_sequence, mutation_type, payload_hash, result")
    .eq("user_id", userId)
    .eq("client_mutation_id", mutationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as StoredSyncReceipt | null) ?? null;
}

export async function storeSyncReceipt(
  client: DomainSupabaseClient,
  input: {
    userId: string;
    mutationId: string;
    mutationType: string;
    payloadHash: string;
    serverSequence: number;
    result: unknown;
  },
): Promise<void> {
  const { error } = await admin(client).from("sync_mutation_receipts").insert({
    user_id: input.userId,
    client_mutation_id: input.mutationId,
    mutation_type: input.mutationType,
    payload_hash: input.payloadHash,
    server_sequence: input.serverSequence,
    result: input.result,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function allocateServerSequences(
  client: DomainSupabaseClient,
  userId: string,
  count: number,
): Promise<number> {
  const { data, error } = await admin(client).rpc("allocate_sync_server_sequence", {
    p_user_id: userId,
    p_count: count,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as number;
}

export async function getLastServerSequence(
  client: DomainSupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await admin(client)
    .from("sync_user_sequence")
    .select("last_sequence")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as { last_sequence: number } | null)?.last_sequence ?? 0;
}
