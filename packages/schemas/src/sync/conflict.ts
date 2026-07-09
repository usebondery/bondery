import { z } from "zod";
import { contactSchema } from "#entities/contact.js";
import { apiErrorResponseSchema } from "#errors/api-error-response.js";

/** HTTP 409 when a contact update conflicts with a newer server version. */
export const syncConflictErrorResponseSchema = apiErrorResponseSchema
  .extend({
    error: apiErrorResponseSchema.shape.error.extend({
      code: z.literal("sync_conflict"),
      details: z.object({ contact: contactSchema }),
    }),
  })
  .meta({ id: "SyncConflictError" });

export type SyncConflictErrorResponse = z.infer<typeof syncConflictErrorResponseSchema>;
