import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  addContactsToGroupRequestSchema,
  addContactsToGroupResponseSchema,
  contactGroupsResponseSchema,
  createGroupSchema,
  deleteGroupsRequestSchema,
  groupContactsListResponseSchema,
  groupMembersListResponseSchema,
  groupResponseSchema,
  groupSchema,
  groupsListResponseSchema,
  groupWithCountSchema,
  peopleGroupSchema,
  removeGroupMembersRequestSchema,
  removeGroupMembersResponseSchema,
  updateGroupSchema,
} from "./schema.js";
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

export type _Group = Assert<IsEqual<Group, z.infer<typeof groupSchema>>>;
export type _GroupWithCount = Assert<IsEqual<GroupWithCount, z.infer<typeof groupWithCountSchema>>>;
export type _PeopleGroup = Assert<IsEqual<PeopleGroup, z.infer<typeof peopleGroupSchema>>>;
export type _CreateGroupInput = Assert<
  IsEqual<CreateGroupInput, z.infer<typeof createGroupSchema>>
>;
export type _UpdateGroupInput = Assert<
  IsEqual<UpdateGroupInput, z.infer<typeof updateGroupSchema>>
>;
export type _AddContactsToGroupRequest = Assert<
  IsEqual<AddContactsToGroupRequest, z.infer<typeof addContactsToGroupRequestSchema>>
>;
export type _AddContactsToGroupResponse = Assert<
  IsEqual<AddContactsToGroupResponse, z.infer<typeof addContactsToGroupResponseSchema>>
>;
export type _RemoveGroupMembersRequest = Assert<
  IsEqual<RemoveGroupMembersRequest, z.infer<typeof removeGroupMembersRequestSchema>>
>;
export type _RemoveGroupMembersResponse = Assert<
  IsEqual<RemoveGroupMembersResponse, z.infer<typeof removeGroupMembersResponseSchema>>
>;
export type _GroupsListResponse = Assert<
  IsEqual<GroupsListResponse, z.infer<typeof groupsListResponseSchema>>
>;
export type _GroupMembersListResponse = Assert<
  IsEqual<GroupMembersListResponse, z.infer<typeof groupMembersListResponseSchema>>
>;
export type _GroupContactsListResponse = Assert<
  IsEqual<GroupContactsListResponse, z.infer<typeof groupContactsListResponseSchema>>
>;
export type _GroupResponse = Assert<IsEqual<GroupResponse, z.infer<typeof groupResponseSchema>>>;
export type _ContactGroupsResponse = Assert<
  IsEqual<ContactGroupsResponse, z.infer<typeof contactGroupsResponseSchema>>
>;
export type _DeleteGroupsRequest = Assert<
  IsEqual<DeleteGroupsRequest, z.infer<typeof deleteGroupsRequestSchema>>
>;
