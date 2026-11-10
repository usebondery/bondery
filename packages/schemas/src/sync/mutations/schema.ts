import { z } from "zod";
import { updatedAtSchema } from "#entities/_shared/index.js";
import { createContactApiInputSchema, updateContactInputSchema } from "#entities/contact/index.js";
import { replaceImportantDatesSchema } from "#entities/important-date/index.js";
import type { SyncMutation, SyncMutationType } from "./types.js";

export const syncMutationTypeSchema: z.ZodType<SyncMutationType> = z.enum([
  "contact.create",
  "contact.update",
  "contact.delete",
  "contact.addTag",
  "contact.removeTag",
  "contact.replaceImportantDates",
  "group.create",
  "group.update",
  "group.delete",
  "group.addMembers",
  "group.removeMembers",
  "tag.create",
  "tag.update",
  "tag.delete",
]);

const syncMutationBaseSchema = z.object({
  baseUpdatedAt: updatedAtSchema
    .optional()
    .describe("Client last-seen `updatedAt` for conflict checks"),
  clientSequence: z
    .number()
    .int()
    .positive()
    .describe("Client-assigned sequence for this mutation"),
  id: z.uuid().describe("Mutation identifier"),
});

export const contactCreatePayloadSchema = createContactApiInputSchema.extend({
  id: z
    .uuid()
    .optional()
    .describe("Client-supplied contact id. The API generates one when omitted."),
});

export const contactUpdatePayloadSchema = updateContactInputSchema;

export const contactDeletePayloadSchema = z.object({}).optional();

export const contactTagPayloadSchema = z.object({
  tagId: z.string().uuid().describe("Tag identifier"),
});

export const contactReplaceImportantDatesPayloadSchema = z.object({
  dates: replaceImportantDatesSchema.describe("Important dates to store. Replaces the full set."),
});

export const groupCreatePayloadSchema = z.object({
  color: z.string().min(1).describe("Hex color used for the group chip"),
  emoji: z.string().min(1).describe("Emoji shown on the group chip"),
  id: z.uuid().optional().describe("Client-supplied group id. The API generates one when omitted."),
  label: z.string().min(1).describe("Group name"),
});

export const groupUpdatePayloadSchema = z.object({
  color: z.string().min(1).optional().describe("Hex color used for the group chip"),
  emoji: z.string().min(1).optional().describe("Emoji shown on the group chip"),
  label: z.string().min(1).optional().describe("Group name"),
});

export const groupMembersPayloadSchema = z.object({
  personIds: z.array(z.string().uuid()).min(1).describe("Contact identifiers to include"),
});

export const tagCreatePayloadSchema = z.object({
  color: z.string().optional().describe("Hex color used for the tag chip"),
  id: z.uuid().optional().describe("Client-supplied tag id. The API generates one when omitted."),
  label: z.string().min(1).describe("Tag name"),
});

export const tagUpdatePayloadSchema = z.object({
  color: z.string().optional().describe("Hex color used for the tag chip"),
  label: z.string().min(1).optional().describe("Tag name"),
});

export const syncMutationSchema = z.discriminatedUnion("type", [
  syncMutationBaseSchema.extend({
    payload: contactCreatePayloadSchema.describe("Create-contact fields"),
    type: z.literal("contact.create").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: contactUpdatePayloadSchema.describe("Fields to change"),
    type: z.literal("contact.update").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: contactDeletePayloadSchema.describe("Empty payload"),
    type: z.literal("contact.delete").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: contactTagPayloadSchema.describe("Tag to add"),
    type: z.literal("contact.addTag").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: contactTagPayloadSchema.describe("Tag to remove"),
    type: z.literal("contact.removeTag").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: contactReplaceImportantDatesPayloadSchema.describe("Replacement important dates"),
    type: z.literal("contact.replaceImportantDates").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    payload: groupCreatePayloadSchema.describe("Create-group fields"),
    type: z.literal("group.create").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: groupUpdatePayloadSchema.describe("Fields to change"),
    type: z.literal("group.update").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: z.object({}).optional().describe("Empty payload"),
    type: z.literal("group.delete").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: groupMembersPayloadSchema.describe("Members to add"),
    type: z.literal("group.addMembers").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: groupMembersPayloadSchema.describe("Members to remove"),
    type: z.literal("group.removeMembers").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    payload: tagCreatePayloadSchema.describe("Create-tag fields"),
    type: z.literal("tag.create").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: tagUpdatePayloadSchema.describe("Fields to change"),
    type: z.literal("tag.update").describe("Mutation type"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid().describe("Identifier of the mutated record"),
    payload: z.object({}).optional().describe("Empty payload"),
    type: z.literal("tag.delete").describe("Mutation type"),
  }),
]) as z.ZodType<SyncMutation>;

export const SERVER_ONLY_MUTATION_TYPES = new Set<SyncMutationType>([
  // Reserved — reject if client sends these
]);
