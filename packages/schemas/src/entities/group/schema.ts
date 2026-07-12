import { z } from "zod";
import { GROUP_LABEL_MAX_LENGTH } from "#constants/index.js";
import { hexColorSchema } from "#primitives/index.js";
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
} from "../_shared/schema.js";
import {
  contactListItemSchema,
  contactPreviewSchema,
  contactsFilterSchema,
} from "../contact/schema.js";
import type {
  AddContactsToGroupRequest,
  AddContactsToGroupResponse,
  ContactGroupsResponse,
  CreateGroupInput,
  DeleteGroupsRequest,
  Group,
  GroupContactsListResponse,
  GroupMembersListResponse,
  GroupResponse,
  GroupsListResponse,
  GroupWithCount,
  PeopleGroup,
  RemoveGroupMembersRequest,
  RemoveGroupMembersResponse,
  UpdateGroupInput,
} from "./types.js";

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
  .extend(entityAuditSchema.shape) satisfies z.ZodType<Group>;

export const groupWithCountSchema = groupSchema.extend({
  contactCount: z.number(),
  previewContacts: z.array(contactPreviewSchema).optional(),
}) satisfies z.ZodType<GroupWithCount>;

export const peopleGroupSchema = z.object({
  created_at: createdAtSchema,
  groupId: z.string(),
  id: z.string(),
  personId: z.string(),
  userId: z.string(),
}) satisfies z.ZodType<PeopleGroup>;

export const createGroupSchema = groupEditableFieldsSchema satisfies z.ZodType<CreateGroupInput>;

export const updateGroupSchema =
  groupEditableFieldsSchema.partial() satisfies z.ZodType<UpdateGroupInput>;

export const addContactsToGroupRequestSchema = z.union([
  personIdsSelectionSchema,
  z.object({
    contactFilter: contactsFilterSchema,
    excludePersonIds: excludePersonIdsSchema,
  }),
]) satisfies z.ZodType<AddContactsToGroupRequest>;

export const addContactsToGroupResponseSchema = messageResponseSchema.extend({
  addedCount: z.number(),
  skippedCount: z.number(),
}) satisfies z.ZodType<AddContactsToGroupResponse>;

export const removeGroupMembersRequestSchema = z.union([
  personIdsSelectionSchema,
  z.object({
    excludePersonIds: excludePersonIdsSchema,
    memberFilter: contactsFilterSchema,
  }),
]) satisfies z.ZodType<RemoveGroupMembersRequest>;

export const removeGroupMembersResponseSchema = messageResponseSchema.extend({
  removedCount: z.number().optional(),
}) satisfies z.ZodType<RemoveGroupMembersResponse>;

export const groupsListResponseSchema = makeListResponseSchema(
  "groups",
  groupWithCountSchema,
) satisfies z.ZodType<GroupsListResponse>;

export const groupMembersListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactPreviewSchema,
) satisfies z.ZodType<GroupMembersListResponse>;

export const groupContactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactListItemSchema,
).extend({
  group: z.object({
    id: z.string(),
    label: z.string(),
  }),
}) satisfies z.ZodType<GroupContactsListResponse>;

export const groupResponseSchema = z.object({
  group: groupSchema,
}) satisfies z.ZodType<GroupResponse>;

export const contactGroupsResponseSchema = makeCollectionResponseSchema(
  "groups",
  groupWithCountSchema,
) satisfies z.ZodType<ContactGroupsResponse>;

export const deleteGroupsRequestSchema = idsRequestSchema satisfies z.ZodType<DeleteGroupsRequest>;
