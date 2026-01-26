import type { ContactPreview } from "./contact";

/**
 * Group Domain Types
 * Types for group/category management
 */

/**
 * Group entity - represents a group/category for organizing contacts
 * Uses camelCase for API/frontend consumption
 */
export interface Group {
  id: string;
  userId: string;
  label: string;
  emoji: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Group with contact count for list view
 */
export interface GroupWithCount extends Group {
  contactCount: number;
  previewContacts?: ContactPreview[];
}

/**
 * People-Group membership record
 */
export interface PeopleGroup {
  id: string;
  personId: string;
  groupId: string;
  userId: string;
  createdAt: string;
}

/**
 * Data required to create a new group
 */
export interface CreateGroupInput {
  label: string;
  emoji?: string;
  color?: string;
}

/**
 * Data for updating an existing group (all fields optional)
 */
export type UpdateGroupInput = Partial<Omit<Group, "id" | "userId" | "createdAt">>;

/**
 * Response from groups list endpoint
 */
export interface GroupsListResponse {
  groups: GroupWithCount[];
  totalCount: number;
}

/**
 * Response from single group fetch
 */
export interface GroupResponse {
  group: Group;
}

/**
 * Request body for adding/removing people from a group
 */
export interface GroupMembershipRequest {
  personIds: string[];
}

/**
 * Request body for deleting multiple groups
 */
export interface DeleteGroupsRequest {
  ids: string[];
}
