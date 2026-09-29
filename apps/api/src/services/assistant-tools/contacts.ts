import type { CreateContactInput, UpdateContactInput } from "@bondery/schemas";
import { contactWritableFieldsSchema, createContactApiInputSchema } from "@bondery/schemas";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { getLinkedInData } from "../../domains/contacts/enrichment/linkedin-data.js";
import { createContact, deleteContact, updateContact } from "../../domains/contacts/index.js";
import {
  findContactBySocial,
  getContact,
  getContactGroups,
  getContactTags,
} from "../contacts/queries-detail.js";
import { listContacts } from "../contacts/queries-list.js";
import { ASSISTANT_COLLECTION_CAP, assistantPageSize } from "./collection-cap.js";

export const searchContactsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
  search: z.string().min(1).max(200).describe("Name or free-text search"),
  sort: z
    .enum([
      "nameAsc",
      "nameDesc",
      "surnameAsc",
      "surnameDesc",
      "interactionAsc",
      "interactionDesc",
      "createdAtAsc",
      "createdAtDesc",
    ])
    .optional(),
});

export const getContactInputSchema = z.object({
  personId: z.string().uuid(),
});

export const getContactBySocialInputSchema = z.object({
  handle: z.string().trim().min(1).max(200),
  platform: z.enum(["instagram", "linkedin", "facebook"]),
});

export const getContactLinkedinInputSchema = z.object({
  personId: z.string().uuid(),
});

export const createContactInputSchema = createContactApiInputSchema;

export const updateContactInputSchema = contactWritableFieldsSchema.extend({
  personId: z.string().uuid(),
});

export const deleteContactInputSchema = z.object({
  personId: z.string().uuid(),
});

function definedPatch(value: Record<string, unknown>): UpdateContactInput {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as UpdateContactInput;
}

export async function executeSearchContacts(
  ctx: DomainContext,
  args: z.infer<typeof searchContactsInputSchema>,
) {
  return listContacts(ctx, {
    limit: assistantPageSize(args.limit),
    offset: args.offset ?? 0,
    search: args.search,
    ...(args.sort !== undefined ? { sort: args.sort } : {}),
  });
}

export async function executeGetContact(
  ctx: DomainContext,
  args: z.infer<typeof getContactInputSchema>,
) {
  return getContact(ctx, args.personId);
}

export async function executeGetContactBySocial(
  ctx: DomainContext,
  args: z.infer<typeof getContactBySocialInputSchema>,
) {
  return findContactBySocial(ctx, { handle: args.handle, platform: args.platform });
}

export async function executeGetContactGroups(
  ctx: DomainContext,
  args: z.infer<typeof getContactInputSchema>,
) {
  return getContactGroups(domainDb(ctx), ctx.user.id, args.personId);
}

export async function executeGetContactTags(
  ctx: DomainContext,
  args: z.infer<typeof getContactInputSchema>,
) {
  return getContactTags(domainDb(ctx), ctx.user.id, args.personId);
}

export async function executeGetContactLinkedin(
  ctx: DomainContext,
  args: z.infer<typeof getContactLinkedinInputSchema>,
) {
  return getLinkedInData(ctx, args.personId);
}

export async function executeCreateContact(ctx: DomainContext, input: CreateContactInput) {
  const created = await createContact(ctx, input);
  return { contact: created.data.contact, txid: created.txid };
}

export async function executeUpdateContact(
  ctx: DomainContext,
  args: z.infer<typeof updateContactInputSchema>,
) {
  const { personId, ...patchFields } = args;
  const updated = await updateContact(ctx, {
    patch: definedPatch(patchFields),
    personId,
  });
  return { contact: updated.data.contact, txid: updated.txid };
}

export async function executeDeleteContact(
  ctx: DomainContext,
  args: z.infer<typeof deleteContactInputSchema>,
) {
  await deleteContact(ctx, args.personId);
  return { message: "Contact deleted successfully" };
}
