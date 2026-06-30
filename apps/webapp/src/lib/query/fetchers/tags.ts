import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ContactPreview, PaginationMeta, Tag, TagWithCount } from "@bondery/schemas";
import { appendAvatarParams } from "@/lib/avatarParams";
import { createClientFetcher } from "./createClientFetcher";
import { normalizePaginatedList } from "./pagination";

export interface TagsListParams {
  previewLimit?: number;
}

export interface TagMembersParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export function buildTagsListPath({ previewLimit = 3 }: TagsListParams = {}): string {
  const params = new URLSearchParams();
  params.set("previewLimit", String(previewLimit));
  appendAvatarParams(params, "small");
  return `${API_ROUTES.TAGS}?${params.toString()}`;
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

export function createTagsListQueryFn(params?: TagsListParams) {
  const fetch = createClientFetcher();
  const path = buildTagsListPath(params);
  return async (): Promise<TagWithCount[]> => {
    const raw = await fetch<{ tags?: TagWithCount[] }>(path);
    return raw.tags ?? [];
  };
}

export function createTagMembersQueryFn(tagId: string, params?: TagMembersParams) {
  const fetch = createClientFetcher();
  const path = buildTagMembersPath(tagId, params);
  return async (): Promise<{ contacts: ContactPreview[]; pagination: PaginationMeta }> => {
    const raw = await fetch<{ contacts?: ContactPreview[]; pagination?: PaginationMeta }>(path);
    const { items, pagination } = normalizePaginatedList<ContactPreview, "contacts">(
      raw,
      "contacts",
      params?.limit ?? 50,
    );
    return { contacts: items, pagination };
  };
}

export function createTagDetailQueryFn(id: string) {
  const fetch = createClientFetcher();
  return async (): Promise<Tag> => {
    const raw = await fetch<{ tag?: Tag }>(`${API_ROUTES.TAGS}/${id}`);
    if (!raw.tag) throw new Error("Tag not found");
    return raw.tag;
  };
}
