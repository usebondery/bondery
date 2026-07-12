import { z } from "zod";
import { type ContactId, EXAMPLE_CONTACT_ID } from "./types.js";

/** Contact person ID — RFC 4122 UUID used on API wire shapes. */
export const contactIdSchema = z.string().uuid().meta({
  description: "Contact person UUID",
  example: EXAMPLE_CONTACT_ID,
  id: "ContactId",
}) satisfies z.ZodType<ContactId>;
