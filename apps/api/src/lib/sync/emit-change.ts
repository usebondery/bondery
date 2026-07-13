import type { Json } from "@bondery/schemas/supabase.types";
import type { SyncChange, SyncEmitMeta, SyncTableKey, SyncWakeEvent } from "@bondery/schemas/sync";
import { createAdminClient } from "../data/supabase.js";
import { allocateServerSequences } from "./idempotency.js";
import { notifySyncWake } from "./wake/index.js";

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

export async function emitSyncBatch(
  userId: string,
  changes: SyncChange[],
  meta?: SyncEmitMeta,
): Promise<number | null> {
  if (changes.length === 0) {
    return null;
  }

  const admin = createAdminClient();
  const serverSequence = await allocateServerSequences(admin, userId, 1);

  const rows = changes.map((change, changeIndex) => ({
    change_index: changeIndex,
    entity_id: change.entityId,
    operation: change.operation,
    row_data: change.value as Json | null,
    server_sequence: serverSequence,
    table_name: change.table,
    user_id: userId,
  }));

  const { error } = await admin.from("sync_change_log").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  void notifySyncWake(userId, syncWakeEventFromChanges(serverSequence, changes, meta));

  return serverSequence;
}
