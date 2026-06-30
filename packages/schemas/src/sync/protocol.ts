/** Current sync API contract version — bump when push/pull payloads break. */
export const SYNC_PROTOCOL_VERSION = 2;

/** Mobile local SQLite DDL version — bump when resync required. */
export const SQLITE_SCHEMA_VERSION = 3;

export const SYNC_PROTOCOL_HEADER = "x-bondery-sync-protocol";
export const SQLITE_SCHEMA_HEADER = "x-bondery-sqlite-schema";

export const SYNC_BATCH_MAX_MUTATIONS = 50;
