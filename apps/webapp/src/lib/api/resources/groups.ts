import { API_ROUTES } from "@bondery/helpers/globals/paths";

import type { Contact, Group, GroupWithCount, PaginationMeta } from "@bondery/schemas";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";
import { appendAvatarParams } from "@/lib/contacts/avatarParams";

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

export function buildGroupDetailPath(id: string): string {
  return `${API_ROUTES.GROUPS}/${id}`;
}

export function parseGroupDetail(raw: { group?: Group }): Group {
  if (!raw.group) {
    throw new Error("Group not found");
  }

  return raw.group;
}

export function buildGroupMembersPath(groupId: string, params: GroupMembersParams = {}): string {
  const search = new URLSearchParams();

  search.set("limit", String(params.limit ?? 50));

  search.set("offset", String(params.offset ?? 0));

  if (params.search) {
    search.set("search", params.search);
  }

  if (params.sort) {
    search.set("sort", params.sort);
  }

  appendAvatarParams(search, "small");

  return `${API_ROUTES.GROUPS}/${groupId}/contacts?${search.toString()}`;
}

export function parseGroupMembers(
  raw: Record<string, unknown>,

  fallbackLimit = 50,
): GroupMembersResult {
  const { items, pagination } = normalizePaginatedList<Contact, "contacts">(
    raw,

    "contacts",

    fallbackLimit,
  );

  return { contacts: items, pagination };
}
