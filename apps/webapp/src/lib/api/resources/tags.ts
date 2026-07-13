import { API_ROUTES } from "@bondery/helpers/globals/paths";

import type { ContactPreview, PaginationMeta, Tag, TagWithCount } from "@bondery/schemas";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";
import { appendAvatarParams } from "@/lib/contacts/avatarParams";

export interface TagsListParams {
  previewLimit?: number;
}

export interface TagMembersParams {
  limit?: number;

  offset?: number;

  search?: string;
}

export interface TagMembersResult {
  contacts: ContactPreview[];

  pagination: PaginationMeta;
}

export function buildTagsListPath({ previewLimit = 3 }: TagsListParams = {}): string {
  const params = new URLSearchParams();

  params.set("previewLimit", String(previewLimit));

  appendAvatarParams(params, "small");

  return `${API_ROUTES.TAGS}?${params.toString()}`;
}

export function parseTagsList(raw: { tags?: TagWithCount[] }): TagWithCount[] {
  return raw.tags ?? [];
}

export function buildTagDetailPath(id: string): string {
  return `${API_ROUTES.TAGS}/${id}`;
}

export function parseTagDetail(raw: { tag?: Tag }): Tag {
  if (!raw.tag) {
    throw new Error("Tag not found");
  }

  return raw.tag;
}

export function buildTagMembersPath(tagId: string, params: TagMembersParams = {}): string {
  const search = new URLSearchParams();

  if (params.limit != null) {
    search.set("limit", String(params.limit));
  }

  if (params.offset != null) {
    search.set("offset", String(params.offset));
  }

  if (params.search) {
    search.set("search", params.search);
  }

  appendAvatarParams(search, "small");

  const query = search.toString();

  return query
    ? `${API_ROUTES.TAGS}/${tagId}/contacts?${query}`
    : `${API_ROUTES.TAGS}/${tagId}/contacts`;
}

export function parseTagMembers(
  raw: Record<string, unknown>,

  fallbackLimit = 50,
): TagMembersResult {
  const { items, pagination } = normalizePaginatedList<ContactPreview, "contacts">(
    raw,

    "contacts",

    fallbackLimit,
  );

  return { contacts: items, pagination };
}
