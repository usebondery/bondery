import "server-only";

import type { Group, GroupWithCount } from "@bondery/schemas";

import {
  buildGroupDetailPath,
  buildGroupMembersPath,
  buildGroupsListPath,
  type GroupMembersParams,
  type GroupMembersResult,
  type GroupsListParams,
  type GroupsListResult,
  normalizeGroupsList,
  parseGroupDetail,
  parseGroupMembers,
} from "@/lib/api/resources/groups";

import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type GroupReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const GROUPS_TAG = { next: { tags: ["groups"] } } satisfies ServerApiFetchOptions;

export async function getGroupsListServer(
  params?: GroupsListParams,

  options: GroupReadOptions = {},
): Promise<GroupsListResult> {
  const raw = await serverApiJson<{ groups?: GroupWithCount[]; totalCount?: number }>(
    buildGroupsListPath(params),

    undefined,

    { ...GROUPS_TAG, ...options },
  );

  return normalizeGroupsList(raw);
}

export async function getGroupDetailServer(
  id: string,

  options: GroupReadOptions = {},
): Promise<Group> {
  const raw = await serverApiJson<{ group?: Group }>(
    buildGroupDetailPath(id),

    undefined,

    { ...GROUPS_TAG, ...options },
  );

  return parseGroupDetail(raw);
}

export async function getGroupMembersServer(
  groupId: string,

  params?: GroupMembersParams,

  options: GroupReadOptions = {},
): Promise<GroupMembersResult> {
  const raw = await serverApiJson<Record<string, unknown>>(
    buildGroupMembersPath(groupId, params),

    undefined,

    { next: { tags: ["groups", "contacts"] }, ...options },
  );

  return parseGroupMembers(raw, params?.limit ?? 50);
}
