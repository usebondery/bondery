import { shareContactRequestSchema } from "@bondery/schemas";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import { getContactSharingPreview, shareContact } from "../../domains/contacts/index.js";

export const getContactShareInputSchema = z.object({
  personId: z.string().uuid(),
});

export const createContactShareInputSchema = shareContactRequestSchema;

export async function executeGetContactShare(
  ctx: DomainContext,
  args: z.infer<typeof getContactShareInputSchema>,
) {
  return getContactSharingPreview(ctx, args.personId);
}

export async function executeCreateContactShare(
  ctx: DomainContext,
  input: z.infer<typeof createContactShareInputSchema>,
) {
  return shareContact(ctx, input);
}
