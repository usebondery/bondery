import { z } from "zod";
import { GROUP_LABEL_MAX_LENGTH } from "#constants/index.js";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  excludePersonIdsSchema,
  idsRequestSchema,
  labelFieldSchema,
  makeCollectionResponseSchema,
  makeListResponseSchema,
  makePaginatedListResponseSchema,
  messageResponseSchema,
  personIdsSelectionSchema,
} from "#entities/_shared.js";
import { contactPreviewSchema, contactSchema, contactsFilterSchema } from "#entities/contact.js";
import { hexColorSchema } from "#primitives/index.js";

const groupEditableFieldsSchema = z.object({
  color: hexColorSchema,
  emoji: z.string().trim().min(1, { error: "Emoji is required" }),
  label: labelFieldSchema(GROUP_LABEL_MAX_LENGTH),
});

export const groupSchema = entityIdentitySchema
  .extend({
    color: z.string().nullable(),
    emoji: z.string().nullable(),
    label: z.string(),
  })
  .extend(entityAuditSchema.shape);

export const groupWithCountSchema = groupSchema.extend({
  contactCount: z.number(),
  previewContacts: z.array(contactPreviewSchema).optional(),
});

export const peopleGroupSchema = z.object({
  created_at: createdAtSchema,
  groupId: z.string(),
  id: z.string(),
  personId: z.string(),
  userId: z.string(),
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
    excludePersonIds: excludePersonIdsSchema,
    memberFilter: contactsFilterSchema,
  }),
]);

export const removeGroupMembersResponseSchema = messageResponseSchema.extend({
  removedCount: z.number().optional(),
});

export const groupsListResponseSchema = makeListResponseSchema("groups", groupWithCountSchema);

export const groupMembersListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactPreviewSchema,
);

export const groupContactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSchema,
).extend({
  group: z.object({
    id: z.string(),
    label: z.string(),
  }),
});

export const groupResponseSchema = z.object({
  group: groupSchema,
});

export const contactGroupsResponseSchema = makeCollectionResponseSchema(
  "groups",
  groupWithCountSchema,
);

export const deleteGroupsRequestSchema = idsRequestSchema;

export type Group = z.infer<typeof groupSchema>;
export type GroupWithCount = z.infer<typeof groupWithCountSchema>;
export type PeopleGroup = z.infer<typeof peopleGroupSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddContactsToGroupRequest = z.infer<typeof addContactsToGroupRequestSchema>;
export type AddContactsToGroupResponse = z.infer<typeof addContactsToGroupResponseSchema>;
export type RemoveGroupMembersRequest = z.infer<typeof removeGroupMembersRequestSchema>;
export type RemoveGroupMembersResponse = z.infer<typeof removeGroupMembersResponseSchema>;
export type GroupsListResponse = z.infer<typeof groupsListResponseSchema>;
export type GroupMembersListResponse = z.infer<typeof groupMembersListResponseSchema>;
export type GroupResponse = z.infer<typeof groupResponseSchema>;
export type ContactGroupsResponse = z.infer<typeof contactGroupsResponseSchema>;
export type DeleteGroupsRequest = z.infer<typeof deleteGroupsRequestSchema>;
