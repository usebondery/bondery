import type { PaginationMeta } from "../_shared/types.js";
import type { ContactListItem, ContactPreview, ContactsFilter } from "../contact/types.js";

export interface Group {
  color: string | null;
  createdAt: string;
  emoji: string | null;
  id: string;
  label: string;
  updatedAt: string;
  userId: string;
}

export interface GroupWithCount extends Group {
  contactCount: number;
  previewContacts?: ContactPreview[];
}

export interface PeopleGroup {
  created_at: string;
  groupId: string;
  id: string;
  personId: string;
  userId: string;
}

export interface CreateGroupInput {
  color: string;
  emoji: string;
  label: string;
}

export type UpdateGroupInput = Partial<CreateGroupInput>;

export type AddContactsToGroupRequest =
  | { personIds: string[] }
  | { contactFilter: ContactsFilter; excludePersonIds?: string[] };

export interface AddContactsToGroupResponse {
  addedCount: number;
  message: string;
  skippedCount: number;
}

export type RemoveGroupMembersRequest =
  | { personIds: string[] }
  | { excludePersonIds?: string[]; memberFilter: ContactsFilter };

export interface RemoveGroupMembersResponse {
  message: string;
  removedCount?: number;
}

export interface GroupsListResponse {
  groups: GroupWithCount[];
  totalCount: number;
}

export interface GroupMembersListResponse {
  contacts: ContactPreview[];
  pagination: PaginationMeta;
}

export interface GroupContactsListResponse {
  contacts: ContactListItem[];
  group: { id: string; label: string };
  pagination: PaginationMeta;
}

export interface GroupResponse {
  group: Group;
}

export interface ContactGroupsResponse {
  groups: GroupWithCount[];
}

export interface DeleteGroupsRequest {
  ids: string[];
}
