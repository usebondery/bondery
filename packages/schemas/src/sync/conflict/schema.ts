import { z } from "zod";
import { contactSchema } from "#entities/contact/index.js";
import { apiErrorResponseSchema } from "#errors/api-error-response/index.js";
import type { SyncConflictErrorResponse } from "./types.js";

/** HTTP 409 when a contact update conflicts with a newer server version. */
export const syncConflictErrorResponseSchema: z.ZodType<SyncConflictErrorResponse> =
  apiErrorResponseSchema
    .extend({
      error: apiErrorResponseSchema.shape.error.extend({
        code: z.literal("sync_conflict"),
        details: z.object({ contact: contactSchema }),
      }),
    })
    .meta({ id: "SyncConflictError" });
