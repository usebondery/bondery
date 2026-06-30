import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, Group, GroupWithCount, PaginationMeta } from "@bondery/schemas";
import { appendAvatarParams } from "@/lib/avatarParams";
import { createClientFetcher } from "./createClientFetcher";
import { normalizePaginatedList } from "./pagination";

export interface GroupsListParams {
  previewLimit?: number;
}

export interface GroupsListResult {
  groups: GroupWithCount[];
  totalCount: number;
}

export interface GroupMembersParams {
  limit?: number;
  offset?: number;
  search?: string;
  sort?: string;
}

export interface GroupMembersResult {
  contacts: Contact[];
  pagination: PaginationMeta;
}

export function buildGroupsListPath({ previewLimit = 3 }: GroupsListParams = {}): string {
  const params = new URLSearchParams();
  params.set("previewLimit", String(previewLimit));
  appendAvatarParams(params, "small");
  return `${API_ROUTES.GROUPS}?${params.toString()}`;
}

export function normalizeGroupsList(raw: {
  groups?: GroupWithCount[];
  totalCount?: number;
}): GroupsListResult {
  const groups = raw.groups ?? [];
  return {
    groups,
    totalCount: raw.totalCount ?? groups.length,
  };
}

export function createGroupsListQueryFn(params?: GroupsListParams) {
  const fetch = createClientFetcher();
  const path = buildGroupsListPath(params);
  return async (): Promise<GroupsListResult> => {
    const raw = await fetch<{ groups?: GroupWithCount[]; totalCount?: number }>(path);
    return normalizeGroupsList(raw);
  };
}

export function createGroupDetailQueryFn(id: string) {
  const fetch = createClientFetcher();
  return async (): Promise<Group> => {
    const raw = await fetch<{ group?: Group }>(`${API_ROUTES.GROUPS}/${id}`);
    if (!raw.group) throw new Error("Group not found");
    return raw.group;
  };
}

export function buildGroupMembersPath(groupId: string, params: GroupMembersParams = {}): string {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));
  if (params.search) search.set("search", params.search);
  if (params.sort) search.set("sort", params.sort);
  appendAvatarParams(search, "small");
  return `${API_ROUTES.GROUPS}/${groupId}/contacts?${search.toString()}`;
}

export function createGroupMembersQueryFn(groupId: string, params?: GroupMembersParams) {
  const fetch = createClientFetcher();
  const path = buildGroupMembersPath(groupId, params);
  return async (): Promise<GroupMembersResult> => {
    const raw = await fetch<{ contacts?: Contact[]; pagination?: PaginationMeta }>(path);
    const { items, pagination } = normalizePaginatedList<Contact, "contacts">(
      raw,
      "contacts",
      params?.limit ?? 50,
    );
    return { contacts: items, pagination };
  };
}
