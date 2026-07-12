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
  entityId: z.string().uuid(),
  operation: syncChangeOperationSchema,
  table: syncTableKeySchema,
  value: z.record(z.string(), z.unknown()).nullable(),
});

export const syncBatchSchema: z.ZodType<SyncBatch> = z.object({
  changes: z.array(syncChangeSchema).min(1),
  serverSequence: z.number().int().positive(),
});

export const syncPullResponseSchema: z.ZodType<SyncPullResponse> = z.object({
  batches: z.array(syncBatchSchema),
  nextServerSequence: z.number().int().nonnegative(),
  requiresBootstrap: z.boolean().optional(),
});

const syncTableRowsSchema = z.array(z.record(z.string(), z.unknown()));

/** Explicit object shape — z.record(z.enum(...)) breaks fast-json-stringify (invalid JSON). */
const bootstrapTablesShape = Object.fromEntries(
  SYNC_TABLE_KEYS.map((key) => [key, syncTableRowsSchema]),
) as Record<SyncTableKey, typeof syncTableRowsSchema>;

export const syncBootstrapTablesSchema: z.ZodType<SyncBootstrapTables> =
  z.object(bootstrapTablesShape);

export const syncBootstrapResponseSchema: z.ZodType<SyncBootstrapResponse> = z.object({
  nextServerSequence: z.number().int().nonnegative(),
  tables: syncBootstrapTablesSchema,
});
