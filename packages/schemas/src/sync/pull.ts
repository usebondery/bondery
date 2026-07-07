import { z } from "zod";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "#sync/tables.js";
export const syncChangeOperationSchema = z.enum(["insert", "update", "delete"]);

export const syncChangeSchema = z.object({
  table: z.enum(SYNC_TABLE_KEYS as [string, ...string[]]),
  operation: syncChangeOperationSchema,
  entityId: z.string().uuid(),
  value: z.record(z.string(), z.unknown()).nullable(),
});

export type SyncChange = z.infer<typeof syncChangeSchema>;

export const syncBatchSchema = z.object({
  serverSequence: z.number().int().positive(),
  changes: z.array(syncChangeSchema).min(1),
});

export type SyncBatch = z.infer<typeof syncBatchSchema>;

export const syncPullResponseSchema = z.object({
  batches: z.array(syncBatchSchema),
  nextServerSequence: z.number().int().nonnegative(),
  requiresBootstrap: z.boolean().optional(),
});
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;

const syncTableRowsSchema = z.array(z.record(z.string(), z.unknown()));

/** Explicit object shape — z.record(z.enum(...)) breaks fast-json-stringify (invalid JSON). */
const bootstrapTablesShape = Object.fromEntries(
  SYNC_TABLE_KEYS.map((key) => [key, syncTableRowsSchema]),
) as Record<SyncTableKey, typeof syncTableRowsSchema>;

export const syncBootstrapTablesSchema = z.object(bootstrapTablesShape);

export const syncBootstrapResponseSchema = z.object({
  tables: syncBootstrapTablesSchema,
  nextServerSequence: z.number().int().nonnegative(),
});
export type SyncBootstrapResponse = z.infer<typeof syncBootstrapResponseSchema>;
