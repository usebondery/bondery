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
  color: hexColorSchema.describe("Hex color used for the group chip"),
  emoji: z
    .string()
    .trim()
    .min(1, { error: "Emoji is required" })
    .describe("Emoji shown on the group chip"),
  label: labelFieldSchema(GROUP_LABEL_MAX_LENGTH).describe("Group name"),
});

export const groupSchema = entityIdentitySchema
  .extend({
    color: z.string().nullable().describe("Hex color used for the group chip"),
    emoji: z.string().nullable().describe("Emoji shown on the group chip"),
    label: z.string().describe("Group name"),
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<Group>;

export const groupWithCountSchema = groupSchema.extend({
  contactCount: z.number().describe("Number of contacts in this group"),
  previewContacts: z
    .array(contactPreviewSchema)
    .optional()
    .describe("Small sample of members, for previews"),
}) satisfies z.ZodType<GroupWithCount>;

export const peopleGroupSchema = z.object({
  created_at: createdAtSchema.describe("Time this membership was created"),
  groupId: z.string().describe("Group identifier"),
  id: z.string().describe("Membership identifier"),
  personId: z.string().describe("Contact identifier"),
  userId: z.string().describe("Owner account identifier"),
}) satisfies z.ZodType<PeopleGroup>;

export const createGroupSchema = groupEditableFieldsSchema satisfies z.ZodType<CreateGroupInput>;

export const updateGroupSchema =
  groupEditableFieldsSchema.partial() satisfies z.ZodType<UpdateGroupInput>;

export const addContactsToGroupRequestSchema = z.union([
  personIdsSelectionSchema,
  z.object({
    contactFilter: contactsFilterSchema.describe("Filter that selects contacts to add"),
    excludePersonIds: excludePersonIdsSchema,
  }),
]) satisfies z.ZodType<AddContactsToGroupRequest>;

export const addContactsToGroupResponseSchema = messageResponseSchema.extend({
  addedCount: z.number().describe("Number of contacts added"),
  skippedCount: z.number().describe("Number of contacts already in the group"),
}) satisfies z.ZodType<AddContactsToGroupResponse>;

export const removeGroupMembersRequestSchema = z.union([
  personIdsSelectionSchema,
  z.object({
    excludePersonIds: excludePersonIdsSchema,
    memberFilter: contactsFilterSchema.describe("Filter that selects members to remove"),
  }),
]) satisfies z.ZodType<RemoveGroupMembersRequest>;

export const removeGroupMembersResponseSchema = messageResponseSchema.extend({
  removedCount: z.number().optional().describe("Number of contacts removed"),
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
  group: z
    .object({
      id: z.string().describe("Group identifier"),
      label: z.string().describe("Group name"),
    })
    .describe("Group this page belongs to"),
}) satisfies z.ZodType<GroupContactsListResponse>;

export const groupResponseSchema = z.object({
  group: groupSchema.describe("Group record"),
}) satisfies z.ZodType<GroupResponse>;

export const contactGroupsResponseSchema = makeCollectionResponseSchema(
  "groups",
  groupWithCountSchema,
) satisfies z.ZodType<ContactGroupsResponse>;

export const deleteGroupsRequestSchema = idsRequestSchema satisfies z.ZodType<DeleteGroupsRequest>;
