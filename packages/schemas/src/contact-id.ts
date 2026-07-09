import { z } from "zod";

/** Example contact UUID for OpenAPI request/response samples. */
export const EXAMPLE_CONTACT_ID = "550e8400-e29b-41d4-a716-446655440000";

/** Contact person ID — RFC 4122 UUID used on API wire shapes. */
export const contactIdSchema = z.string().uuid().meta({
  description: "Contact person UUID",
  example: EXAMPLE_CONTACT_ID,
  id: "ContactId",
});
