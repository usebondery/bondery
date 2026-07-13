import type { PaginationMeta } from "../_shared/types.js";
import type { Contact, ContactPreview } from "../contact/types.js";

export interface Tag {
  color: string | null;
  createdAt: string;
  id: string;
  label: string;
  updatedAt: string;
  userId: string;
}

export interface TagWithCount extends Tag {
  contactCount: number;
  previewContacts?: ContactPreview[];
}

export interface PeopleTag {
  created_at: string;
  id: string;
  personId: string;
  tagId: string;
  userId: string;
}

export interface CreateTagInput {
  label: string;
}

export type UpdateTagInput = Partial<{ color: string; label: string }>;

export interface TagResponse {
  tag: Tag;
}

export type TagUpdateResponse = TagResponse;

export interface AddContactsToTagResponse {
  addedCount: number;
}

export interface RemoveContactsFromTagResponse {
  removedCount: number;
}

export interface TagContactsListResponse {
  contacts: Contact[];
  pagination: PaginationMeta;
}

export interface TagsListResponse {
  tags: TagWithCount[];
  totalCount: number;
}

export interface TagMembersListResponse {
  contacts: ContactPreview[];
  pagination: PaginationMeta;
}

export interface ContactTagsResponse {
  tags: TagWithCount[];
}

export interface ContactTagListResponse {
  tags: Tag[];
}

export interface TagMembershipRequest {
  personIds: string[];
}

export interface ContactTagBody {
  tagId: string;
}

export interface DeleteTagsRequest {
  ids: string[];
}
