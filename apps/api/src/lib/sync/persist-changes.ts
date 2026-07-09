import type { SyncChange, SyncEmitMeta } from "@bondery/schemas/sync";
import { emitSyncBatch } from "./emit-change.js";

/** Single choke point for CRM commands writing to sync_change_log. */
export async function persistSyncChanges(
  userId: string,
  changes: SyncChange[],
  meta?: SyncEmitMeta,
): Promise<number | null> {
  return emitSyncBatch(userId, changes, meta);
}
