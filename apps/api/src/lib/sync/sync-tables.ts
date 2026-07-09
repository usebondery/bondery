import { SYNC_TABLE_KEYS, type SyncTableKey } from "@bondery/schemas/sync";

export { SYNC_TABLE_KEYS, type SyncTableKey };

export const SYNC_TABLES = Object.fromEntries(SYNC_TABLE_KEYS.map((key) => [key, key])) as Record<
  SyncTableKey,
  SyncTableKey
>;

export function isSyncTableKey(value: string): value is SyncTableKey {
  return (SYNC_TABLE_KEYS as readonly string[]).includes(value);
}
