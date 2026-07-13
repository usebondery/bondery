import type { SyncTableKey } from "../tables.js";

export type SyncChangeOperation = "insert" | "update" | "delete";

export interface SyncChange {
  entityId: string;
  operation: SyncChangeOperation;
  table: SyncTableKey;
  value: Record<string, unknown> | null;
}

export interface SyncBatch {
  changes: SyncChange[];
  serverSequence: number;
}

export interface SyncPullResponse {
  batches: SyncBatch[];
  nextServerSequence: number;
  requiresBootstrap?: boolean;
}

export type SyncBootstrapTables = Record<SyncTableKey, Record<string, unknown>[]>;

export interface SyncBootstrapResponse {
  nextServerSequence: number;
  tables: SyncBootstrapTables;
}
