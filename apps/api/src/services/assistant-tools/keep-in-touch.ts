import { z } from "zod";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import { getKeepInTouchOverdueCount } from "../../domains/contacts/keep-in-touch.js";
import { updateContact } from "../../domains/contacts/update-contact.js";
import { listContacts } from "../contacts/queries-list.js";
import { ASSISTANT_COLLECTION_CAP, assistantPageSize } from "./collection-cap.js";

export const getKeepInTouchCountInputSchema = z.object({});

export const getKeepInTouchContactsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
  search: z.string().min(1).max(200).optional(),
});

export const updateKeepInTouchInputSchema = z.object({
  keepFrequencyDays: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe("Days between check-ins; null clears the cadence"),
  lastInteraction: z
    .string()
    .nullable()
    .optional()
    .describe("ISO date or datetime; null clears last interaction"),
  personId: z.string().uuid(),
});

export async function executeGetKeepInTouchCount(ctx: DomainContext) {
  return getKeepInTouchOverdueCount(ctx);
}

export async function executeGetKeepInTouchContacts(
  ctx: DomainContext,
  args: z.infer<typeof getKeepInTouchContactsInputSchema>,
) {
  return listContacts(ctx, {
    keepInTouch: true,
    limit: assistantPageSize(args.limit),
    offset: args.offset ?? 0,
    ...(args.search !== undefined ? { search: args.search } : {}),
  });
}

export async function executeUpdateKeepInTouch(
  ctx: DomainContext,
  args: z.infer<typeof updateKeepInTouchInputSchema>,
) {
  if (args.keepFrequencyDays === undefined && args.lastInteraction === undefined) {
    throw new DomainError("Provide keepFrequencyDays and/or lastInteraction", 400, "bad_request");
  }
  const updated = await updateContact(ctx, {
    patch: {
      ...(args.keepFrequencyDays !== undefined
        ? { keepFrequencyDays: args.keepFrequencyDays }
        : {}),
      ...(args.lastInteraction !== undefined ? { lastInteraction: args.lastInteraction } : {}),
    },
    personId: args.personId,
  });
  return { contact: updated.data.contact, txid: updated.txid };
}
