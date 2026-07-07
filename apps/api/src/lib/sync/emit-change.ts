import { createAdminClient } from "../supabase.js";
import { allocateServerSequences } from "./idempotency.js";
import type { SyncChange, SyncEmitMeta, SyncTableKey, SyncWakeEvent } from "@bondery/schemas/sync";
import type { Json } from "@bondery/schemas/supabase.types";
import { notifySyncWake } from "./wake/index.js";

export function syncWakeEventFromChanges(
  serverSequence: number,
  changes: SyncChange[],
  meta?: SyncEmitMeta,
): SyncWakeEvent {
  const affectedTables = [...new Set(changes.map((change) => change.table))] as SyncTableKey[];

  return {
    serverSequence,
    affectedTables,
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
    user_id: userId,
    server_sequence: serverSequence,
    change_index: changeIndex,
    table_name: change.table,
    operation: change.operation,
    entity_id: change.entityId,
    row_data: change.value as Json | null,
  }));

  const { error } = await admin.from("sync_change_log").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  void notifySyncWake(userId, syncWakeEventFromChanges(serverSequence, changes, meta));

  return serverSequence;
}
