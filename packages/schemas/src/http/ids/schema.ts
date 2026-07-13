import { z } from "zod";
import { contactIdSchema, EXAMPLE_CONTACT_ID } from "#contact-id/index.js";

export { contactIdSchema, EXAMPLE_CONTACT_ID };

/** Bulk delete body: `{ ids: uuid[] }` with at least one element. */
export const wireIdsRequestSchema = z.object({
  ids: z
    .array(contactIdSchema)
    .min(1)
    .meta({
      description: "Contact IDs to act on",
      example: [EXAMPLE_CONTACT_ID],
    }),
});
