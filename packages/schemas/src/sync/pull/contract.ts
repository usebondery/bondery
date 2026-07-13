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

type _SyncChangeOperation = Assert<
  IsEqual<SyncChangeOperation, z.infer<typeof syncChangeOperationSchema>>
>;
type _SyncChange = Assert<IsEqual<SyncChange, z.infer<typeof syncChangeSchema>>>;
type _SyncBatch = Assert<IsEqual<SyncBatch, z.infer<typeof syncBatchSchema>>>;
type _SyncPullResponse = Assert<IsEqual<SyncPullResponse, z.infer<typeof syncPullResponseSchema>>>;
type _SyncBootstrapTables = Assert<
  IsEqual<SyncBootstrapTables, z.infer<typeof syncBootstrapTablesSchema>>
>;
type _SyncBootstrapResponse = Assert<
  IsEqual<SyncBootstrapResponse, z.infer<typeof syncBootstrapResponseSchema>>
>;
