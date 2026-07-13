import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { syncConflictErrorResponseSchema } from "./schema.js";
import type { SyncConflictErrorResponse } from "./types.js";

type _SyncConflictErrorResponse = Assert<
  IsEqual<SyncConflictErrorResponse, z.infer<typeof syncConflictErrorResponseSchema>>
>;
