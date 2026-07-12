import { z } from "zod";
import { updatedAtSchema } from "#entities/_shared/index.js";
import { createContactApiInputSchema, updateContactInputSchema } from "#entities/contact/index.js";
import type { SyncMutation, SyncMutationType } from "./types.js";

export const syncMutationTypeSchema: z.ZodType<SyncMutationType> = z.enum([
  "contact.create",
  "contact.update",
  "contact.delete",
  "contact.addTag",
  "contact.removeTag",
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
  baseUpdatedAt: updatedAtSchema.optional(),
  clientSequence: z.number().int().positive(),
  id: z.uuid(),
});

export const contactCreatePayloadSchema = createContactApiInputSchema.extend({
  id: z.uuid().optional(),
});

export const contactUpdatePayloadSchema = updateContactInputSchema;

export const contactDeletePayloadSchema = z.object({}).optional();

export const contactTagPayloadSchema = z.object({
  tagId: z.string().uuid(),
});

export const groupCreatePayloadSchema = z.object({
  color: z.string().min(1),
  emoji: z.string().min(1),
  id: z.uuid().optional(),
  label: z.string().min(1),
});

export const groupUpdatePayloadSchema = z.object({
  color: z.string().min(1).optional(),
  emoji: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
});

export const groupMembersPayloadSchema = z.object({
  personIds: z.array(z.string().uuid()).min(1),
});

export const tagCreatePayloadSchema = z.object({
  color: z.string().optional(),
  id: z.uuid().optional(),
  label: z.string().min(1),
});

export const tagUpdatePayloadSchema = z.object({
  color: z.string().optional(),
  label: z.string().min(1).optional(),
});

export const syncMutationSchema = z.discriminatedUnion("type", [
  syncMutationBaseSchema.extend({
    payload: contactCreatePayloadSchema,
    type: z.literal("contact.create"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: contactUpdatePayloadSchema,
    type: z.literal("contact.update"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: contactDeletePayloadSchema,
    type: z.literal("contact.delete"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: contactTagPayloadSchema,
    type: z.literal("contact.addTag"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: contactTagPayloadSchema,
    type: z.literal("contact.removeTag"),
  }),
  syncMutationBaseSchema.extend({
    payload: groupCreatePayloadSchema,
    type: z.literal("group.create"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: groupUpdatePayloadSchema,
    type: z.literal("group.update"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: z.object({}).optional(),
    type: z.literal("group.delete"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: groupMembersPayloadSchema,
    type: z.literal("group.addMembers"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: groupMembersPayloadSchema,
    type: z.literal("group.removeMembers"),
  }),
  syncMutationBaseSchema.extend({
    payload: tagCreatePayloadSchema,
    type: z.literal("tag.create"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: tagUpdatePayloadSchema,
    type: z.literal("tag.update"),
  }),
  syncMutationBaseSchema.extend({
    entityId: z.string().uuid(),
    payload: z.object({}).optional(),
    type: z.literal("tag.delete"),
  }),
]) as z.ZodType<SyncMutation>;

export const SERVER_ONLY_MUTATION_TYPES = new Set<SyncMutationType>([
  // Reserved — reject if client sends these
]);
