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

type _Group = Assert<IsEqual<Group, z.infer<typeof groupSchema>>>;
type _GroupWithCount = Assert<IsEqual<GroupWithCount, z.infer<typeof groupWithCountSchema>>>;
type _PeopleGroup = Assert<IsEqual<PeopleGroup, z.infer<typeof peopleGroupSchema>>>;
type _CreateGroupInput = Assert<IsEqual<CreateGroupInput, z.infer<typeof createGroupSchema>>>;
type _UpdateGroupInput = Assert<IsEqual<UpdateGroupInput, z.infer<typeof updateGroupSchema>>>;
type _AddContactsToGroupRequest = Assert<
  IsEqual<AddContactsToGroupRequest, z.infer<typeof addContactsToGroupRequestSchema>>
>;
type _AddContactsToGroupResponse = Assert<
  IsEqual<AddContactsToGroupResponse, z.infer<typeof addContactsToGroupResponseSchema>>
>;
type _RemoveGroupMembersRequest = Assert<
  IsEqual<RemoveGroupMembersRequest, z.infer<typeof removeGroupMembersRequestSchema>>
>;
type _RemoveGroupMembersResponse = Assert<
  IsEqual<RemoveGroupMembersResponse, z.infer<typeof removeGroupMembersResponseSchema>>
>;
type _GroupsListResponse = Assert<
  IsEqual<GroupsListResponse, z.infer<typeof groupsListResponseSchema>>
>;
type _GroupMembersListResponse = Assert<
  IsEqual<GroupMembersListResponse, z.infer<typeof groupMembersListResponseSchema>>
>;
type _GroupContactsListResponse = Assert<
  IsEqual<GroupContactsListResponse, z.infer<typeof groupContactsListResponseSchema>>
>;
type _GroupResponse = Assert<IsEqual<GroupResponse, z.infer<typeof groupResponseSchema>>>;
type _ContactGroupsResponse = Assert<
  IsEqual<ContactGroupsResponse, z.infer<typeof contactGroupsResponseSchema>>
>;
type _DeleteGroupsRequest = Assert<
  IsEqual<DeleteGroupsRequest, z.infer<typeof deleteGroupsRequestSchema>>
>;
