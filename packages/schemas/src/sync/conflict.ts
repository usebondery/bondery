import { z } from "zod";
import { contactSchema } from "#entities/contact.js";
import { EXAMPLE_SYNC_CONFLICT_ERROR } from "#openapi/fixtures/errors.js";

/** HTTP 409 when a contact update conflicts with a newer server version. */
export const syncConflictErrorResponseSchema = z
  .object({
    error: z.string(),
    contact: contactSchema,
  })
  .meta({ id: "SyncConflictError", example: EXAMPLE_SYNC_CONFLICT_ERROR });

export type SyncConflictErrorResponse = z.infer<typeof syncConflictErrorResponseSchema>;
