import type { ContactPreview } from "./contact";

/**
 * Tag Domain Types
 * Types for tag management on contacts
 */

/**
 * Tag entity - represents a label/tag for organizing contacts
 * Uses camelCase for API/frontend consumption
 */
export interface Tag {
  id: string;
  userId: string;
  label: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tag with member count and preview contacts for list view
 */
export interface TagWithCount extends Tag {
  contactCount: number;
  previewContacts?: ContactPreview[];
}

/**
 * People-Tag membership record
 */
export interface PeopleTag {
  id: string;
  personId: string;
  tagId: string;
  userId: string;
  createdAt: string;
}

/**
 * Data required to create a new tag
 */
export interface CreateTagInput {
  label: string;
}

/**
 * Data for updating an existing tag (all fields optional)
 */
export type UpdateTagInput = Partial<Omit<Tag, "id" | "userId" | "createdAt">>;

/**
 * Response from tags list endpoint
 */
export interface TagsListResponse {
  tags: TagWithCount[];
  totalCount: number;
}

/**
 * Request body to add/remove people from a tag
 */
export interface TagMembershipRequest {
  personIds: string[];
}

/**
 * Request body to delete multiple tags
 */
export interface DeleteTagsRequest {
  ids: string[];
}
