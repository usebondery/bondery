import { z } from "zod";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "#sync/tables.js";
import { syncTableKeySchema } from "#sync/ws/schema.js";
import type {
  SyncBatch,
  SyncBootstrapResponse,
  SyncBootstrapTables,
  SyncChange,
  SyncChangeOperation,
  SyncPullResponse,
} from "./types.js";

export const syncChangeOperationSchema: z.ZodType<SyncChangeOperation> = z.enum([
  "insert",
  "update",
  "delete",
]);

export const syncChangeSchema: z.ZodType<SyncChange> = z.object({
  entityId: z.string().uuid().describe("Identifier of the changed record"),
  operation: syncChangeOperationSchema.describe("Change operation"),
  table: syncTableKeySchema.describe("Sync table this change belongs to"),
  value: z.record(z.string(), z.unknown()).nullable().describe("New row values. Null for delete."),
});

export const syncBatchSchema: z.ZodType<SyncBatch> = z.object({
  changes: z.array(syncChangeSchema).min(1).describe("Changes in this sequence batch"),
  serverSequence: z.number().int().positive().describe("Server sequence of this batch"),
});

export const syncPullResponseSchema: z.ZodType<SyncPullResponse> = z.object({
  batches: z.array(syncBatchSchema).describe("Change batches after the requested sequence"),
  nextServerSequence: z
    .number()
    .int()
    .nonnegative()
    .describe("Next server sequence the client should pull from"),
  requiresBootstrap: z
    .boolean()
    .optional()
    .describe("True when the client must run bootstrap before pull"),
});

const syncTableRowsSchema = z
  .array(z.record(z.string(), z.unknown()))
  .describe("Snapshot rows for this table");

/** Explicit object shape — z.record(z.enum(...)) breaks fast-json-stringify (invalid JSON). */
const bootstrapTablesShape = Object.fromEntries(
  SYNC_TABLE_KEYS.map((key) => [key, syncTableRowsSchema]),
) as Record<SyncTableKey, typeof syncTableRowsSchema>;

export const syncBootstrapTablesSchema: z.ZodType<SyncBootstrapTables> =
  z.object(bootstrapTablesShape);

export const syncBootstrapResponseSchema: z.ZodType<SyncBootstrapResponse> = z.object({
  nextServerSequence: z
    .number()
    .int()
    .nonnegative()
    .describe("Next server sequence the client should pull from"),
  tables: syncBootstrapTablesSchema.describe("Full table snapshots for this account"),
});
