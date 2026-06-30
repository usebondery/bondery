import {
  SQLITE_SCHEMA_VERSION,
  SYNC_PROTOCOL_HEADER,
  SYNC_PROTOCOL_VERSION,
} from "@bondery/schemas/sync";

export const SYNC_DB_NAME = "bondery-sync.db";

export const SYNC_META_KEYS = {
  deviceId: "device_id",
  clientSequenceCounter: "client_sequence_counter",
  lastServerSequence: "last_server_sequence",
  sqliteSchemaVersion: "sqlite_schema_version",
} as const;

export function syncRequestHeaders(): Record<string, string> {
  return {
    [SYNC_PROTOCOL_HEADER]: String(SYNC_PROTOCOL_VERSION),
    "X-Bondery-SQLite-Schema": String(SQLITE_SCHEMA_VERSION),
  };
}
