import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  syncBatchSchema,
  syncBootstrapResponseSchema,
  syncBootstrapTablesSchema,
  syncChangeOperationSchema,
  syncChangeSchema,
  syncPullResponseSchema,
} from "./schema.js";
import type {
  SyncBatch,
  SyncBootstrapResponse,
  SyncBootstrapTables,
  SyncChange,
  SyncChangeOperation,
  SyncPullResponse,
} from "./types.js";

export type _SyncChangeOperation = Assert<
  IsEqual<SyncChangeOperation, z.infer<typeof syncChangeOperationSchema>>
>;
export type _SyncChange = Assert<IsEqual<SyncChange, z.infer<typeof syncChangeSchema>>>;
export type _SyncBatch = Assert<IsEqual<SyncBatch, z.infer<typeof syncBatchSchema>>>;
export type _SyncPullResponse = Assert<
  IsEqual<SyncPullResponse, z.infer<typeof syncPullResponseSchema>>
>;
export type _SyncBootstrapTables = Assert<
  IsEqual<SyncBootstrapTables, z.infer<typeof syncBootstrapTablesSchema>>
>;
export type _SyncBootstrapResponse = Assert<
  IsEqual<SyncBootstrapResponse, z.infer<typeof syncBootstrapResponseSchema>>
>;
