import { z } from "zod";
import { SYNC_TABLE_KEYS } from "#sync/tables.js";
import {
  EXAMPLE_SYNC_BOOTSTRAP_RESPONSE,
  EXAMPLE_SYNC_PULL_RESPONSE,
} from "#openapi/fixtures/responses.js";

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

export const syncPullResponseSchema = z
  .object({
    batches: z.array(syncBatchSchema),
    nextServerSequence: z.number().int().nonnegative(),
    requiresBootstrap: z.boolean().optional(),
  })
  .meta({ example: EXAMPLE_SYNC_PULL_RESPONSE });

export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;

export const syncBootstrapTablesSchema = z.record(
  z.enum(SYNC_TABLE_KEYS as [string, ...string[]]),
  z.array(z.record(z.string(), z.unknown())),
);

export const syncBootstrapResponseSchema = z
  .object({
    tables: syncBootstrapTablesSchema,
    nextServerSequence: z.number().int().nonnegative(),
  })
  .meta({ example: EXAMPLE_SYNC_BOOTSTRAP_RESPONSE });

export type SyncBootstrapResponse = z.infer<typeof syncBootstrapResponseSchema>;
