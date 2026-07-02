import { z } from "zod";
import { contactSchema } from "#entities/contact.js";

/** HTTP 409 when a contact update conflicts with a newer server version. */
export const syncConflictErrorResponseSchema = z
  .object({
    error: z.string(),
    contact: contactSchema,
  })
  .meta({ id: "SyncConflictError" });
export type SyncConflictErrorResponse = z.infer<typeof syncConflictErrorResponseSchema>;
