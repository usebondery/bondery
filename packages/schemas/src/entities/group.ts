import { z } from "zod";
import { GROUP_LABEL_MAX_LENGTH } from "#constants/index.js";
import { hexColorSchema } from "#primitives/index.js";
import { contactPreviewSchema, contactSchema, contactsFilterSchema } from "#entities/contact.js";
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
import {
  EXAMPLE_ADD_CONTACTS_TO_GROUP_RESPONSE,
  EXAMPLE_CONTACT_GROUPS_RESPONSE,
  EXAMPLE_GROUP_CONTACTS_LIST_RESPONSE,
  EXAMPLE_GROUP_RESPONSE,
  EXAMPLE_GROUPS_LIST_RESPONSE,
  EXAMPLE_REMOVE_GROUP_MEMBERS_RESPONSE,
} from "#openapi/fixtures/schema-examples.js";
import {
  EXAMPLE_ADD_TO_GROUP_REQUEST,
  EXAMPLE_CREATE_GROUP_REQUEST,
  EXAMPLE_PATCH_GROUP_REQUEST,
  EXAMPLE_REMOVE_FROM_GROUP_REQUEST,
} from "#openapi/fixtures/requests.js";

const groupEditableFieldsSchema = z.object({
  label: labelFieldSchema(GROUP_LABEL_MAX_LENGTH),
  emoji: z.string().trim().min(1, { error: "Emoji is required" }),
  color: hexColorSchema,
});

export const groupSchema = entityIdentitySchema.extend({
  label: z.string(),
  emoji: z.string().nullable(),
  color: z.string().nullable(),
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
  created_at: createdAtSchema,
});

export const createGroupSchema = groupEditableFieldsSchema.meta({
  example: EXAMPLE_CREATE_GROUP_REQUEST,
});

export const updateGroupSchema = groupEditableFieldsSchema.partial().meta({
  example: EXAMPLE_PATCH_GROUP_REQUEST,
});

export const addContactsToGroupRequestSchema = z.union([
  personIdsSelectionSchema,
  z.object({
    contactFilter: contactsFilterSchema,
    excludePersonIds: excludePersonIdsSchema,
  }),
]).meta({ example: EXAMPLE_ADD_TO_GROUP_REQUEST });

export const addContactsToGroupResponseSchema = messageResponseSchema
  .extend({
    addedCount: z.number(),
    skippedCount: z.number(),
  })
  .meta({ example: EXAMPLE_ADD_CONTACTS_TO_GROUP_RESPONSE });

export const removeGroupMembersRequestSchema = z.union([
  personIdsSelectionSchema,
  z.object({
    memberFilter: contactsFilterSchema,
    excludePersonIds: excludePersonIdsSchema,
  }),
]).meta({ example: EXAMPLE_REMOVE_FROM_GROUP_REQUEST });

export const removeGroupMembersResponseSchema = messageResponseSchema
  .extend({
    removedCount: z.number().optional(),
  })
  .meta({ example: EXAMPLE_REMOVE_GROUP_MEMBERS_RESPONSE });

export const groupsListResponseSchema = makeListResponseSchema(
  "groups",
  groupWithCountSchema,
).meta({ example: EXAMPLE_GROUPS_LIST_RESPONSE });

export const groupMembersListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactPreviewSchema,
);

export const groupContactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSchema,
)
  .extend({
    group: z.object({
      id: z.string(),
      label: z.string(),
    }),
  })
  .meta({ example: EXAMPLE_GROUP_CONTACTS_LIST_RESPONSE });

export const groupResponseSchema = z
  .object({
    group: groupSchema,
  })
  .meta({ example: EXAMPLE_GROUP_RESPONSE });

export const contactGroupsResponseSchema = makeCollectionResponseSchema(
  "groups",
  groupWithCountSchema,
).meta({ example: EXAMPLE_CONTACT_GROUPS_RESPONSE });

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
