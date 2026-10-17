import { isSyncTableKey, type SyncBatch, type SyncTableKey } from "@bondery/schemas/sync";

export function collectAppliedSyncTables(batches: readonly SyncBatch[]): SyncTableKey[] {
  const tables = new Set<SyncTableKey>();
  for (const batch of batches) {
    for (const change of batch.changes) {
      if (isSyncTableKey(change.table)) {
        tables.add(change.table);
      }
    }
  }
  return Array.from(tables);
}
