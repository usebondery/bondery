import { z } from "zod";
import { GROUP_LABEL_MAX_LENGTH } from "../constants/index.js";
import { hexColorSchema } from "../primitives/index.js";
import { contactPreviewSchema, contactsFilterSchema } from "./contact.js";
import { entityAuditSchema, entityIdentitySchema, excludePersonIdsSchema, idsRequestSchema, labelFieldSchema, makeCollectionResponseSchema, makeListResponseSchema, messageResponseSchema, personIdsSelectionSchema, } from "./_shared.js";
const groupEditableFieldsSchema = z.object({
    label: labelFieldSchema(GROUP_LABEL_MAX_LENGTH),
    emoji: z.string().trim().min(1, { error: "Emoji is required" }),
    color: hexColorSchema,
});
export const groupSchema = entityIdentitySchema.extend({
    label: z.string(),
    emoji: z.string(),
    color: z.string(),
}).extend(entityAuditSchema.shape);
export const groupWithCountSchema = groupSchema.extend({
    contactCount: z.number(),
    previewContacts: z.array(contactPreviewSchema).optional(),
});
export const peopleGroupSchema = z.object({
    id: z.string(),
    personId: z.string(),
    groupId: z.string(),
    userId: z.string(),
    createdAt: z.string().nullable(),
});
export const createGroupSchema = groupEditableFieldsSchema;
export const updateGroupSchema = groupEditableFieldsSchema.partial();
export const addContactsToGroupRequestSchema = z.union([
    personIdsSelectionSchema,
    z.object({
        contactFilter: contactsFilterSchema,
        excludePersonIds: excludePersonIdsSchema,
    }),
]);
export const addContactsToGroupResponseSchema = messageResponseSchema.extend({
    addedCount: z.number(),
    skippedCount: z.number(),
});
export const removeGroupMembersRequestSchema = z.union([
    personIdsSelectionSchema,
    z.object({
        memberFilter: contactsFilterSchema,
        excludePersonIds: excludePersonIdsSchema,
    }),
]);
export const removeGroupMembersResponseSchema = messageResponseSchema.extend({
    removedCount: z.number().optional(),
});
export const groupsListResponseSchema = makeListResponseSchema("groups", groupWithCountSchema);
export const groupResponseSchema = z.object({
    group: groupSchema,
});
export const contactGroupsResponseSchema = makeCollectionResponseSchema("groups", groupWithCountSchema);
export const deleteGroupsRequestSchema = idsRequestSchema;
