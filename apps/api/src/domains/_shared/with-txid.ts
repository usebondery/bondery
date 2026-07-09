import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainSupabaseClient } from "./context.js";

export async function capturePersonSyncTxid(
  client: DomainSupabaseClient,
  personId: string,
  userId: string,
): Promise<string> {
  const { data, error } = await (client as SupabaseClient).rpc(
    "bump_person_updated_at_for_sync" as never,
    {
      p_person_id: personId,
      p_user_id: userId,
    } as never,
  );

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function captureCurrentSyncTxid(client: DomainSupabaseClient): Promise<string> {
  const { data, error } = await (client as SupabaseClient).rpc("get_current_sync_txid" as never);

  if (error) {
    throw new Error(error.message);
  }

  return data as string;
}

export async function withPersonTxid<T extends { personId: string }>(
  client: DomainSupabaseClient,
  userId: string,
  fn: () => Promise<T>,
): Promise<{ data: T; txid: string }> {
  const data = await fn();
  const txid = await capturePersonSyncTxid(client, data.personId, userId);
  return { data, txid };
}

export async function withTxid<T>(
  client: DomainSupabaseClient,
  fn: () => Promise<T>,
): Promise<{ data: T; txid: string }> {
  const data = await fn();
  const txid = await captureCurrentSyncTxid(client);
  return { data, txid };
}
