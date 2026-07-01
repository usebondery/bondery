import { z } from "zod";
import { createContactApiInputSchema, updateContactInputSchema } from "../entities/contact";

export const syncMutationTypeSchema = z.enum([
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

export type SyncMutationType = z.infer<typeof syncMutationTypeSchema>;

const syncMutationBaseSchema = z.object({
  id: z.uuid(),
  clientSequence: z.number().int().positive(),
  baseUpdatedAt: z.string().datetime().optional(),
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
  id: z.uuid().optional(),
  label: z.string().min(1),
  emoji: z.string().min(1),
  color: z.string().min(1),
});

export const groupUpdatePayloadSchema = z.object({
  label: z.string().min(1).optional(),
  emoji: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
});

export const groupMembersPayloadSchema = z.object({
  personIds: z.array(z.string().uuid()).min(1),
});

export const tagCreatePayloadSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().min(1),
  color: z.string().optional(),
});

export const tagUpdatePayloadSchema = z.object({
  label: z.string().min(1).optional(),
  color: z.string().optional(),
});

export const syncMutationSchema = z.discriminatedUnion("type", [
  syncMutationBaseSchema.extend({
    type: z.literal("contact.create"),
    payload: contactCreatePayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("contact.update"),
    entityId: z.string().uuid(),
    payload: contactUpdatePayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("contact.delete"),
    entityId: z.string().uuid(),
    payload: contactDeletePayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("contact.addTag"),
    entityId: z.string().uuid(),
    payload: contactTagPayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("contact.removeTag"),
    entityId: z.string().uuid(),
    payload: contactTagPayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("group.create"),
    payload: groupCreatePayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("group.update"),
    entityId: z.string().uuid(),
    payload: groupUpdatePayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("group.delete"),
    entityId: z.string().uuid(),
    payload: z.object({}).optional(),
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("group.addMembers"),
    entityId: z.string().uuid(),
    payload: groupMembersPayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("group.removeMembers"),
    entityId: z.string().uuid(),
    payload: groupMembersPayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("tag.create"),
    payload: tagCreatePayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("tag.update"),
    entityId: z.string().uuid(),
    payload: tagUpdatePayloadSchema,
  }),
  syncMutationBaseSchema.extend({
    type: z.literal("tag.delete"),
    entityId: z.string().uuid(),
    payload: z.object({}).optional(),
  }),
]);

export type SyncMutation = z.infer<typeof syncMutationSchema>;

type OmitUnion<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Client-side mutation before id / clientSequence are assigned. */
export type SyncMutationInput = OmitUnion<SyncMutation, "id" | "clientSequence"> & {
  id?: string;
};

export const SERVER_ONLY_MUTATION_TYPES = new Set<SyncMutationType>([
  // Reserved — reject if client sends these
]);
