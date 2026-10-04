import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { CreateGroupInput, Group, GroupWithCount, UpdateGroupInput } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
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

export type {
  GroupMembersParams,
  GroupMembersResult,
  GroupsListParams,
  GroupsListResult,
} from "@/lib/api/resources/groups";

export async function getGroupsList(params?: GroupsListParams): Promise<GroupsListResult> {
  const raw = await clientApiJson<{ groups?: GroupWithCount[]; totalCount?: number }>(
    buildGroupsListPath(params),
  );
  return normalizeGroupsList(raw);
}

export async function getGroupDetail(id: string): Promise<Group> {
  const raw = await clientApiJson<{ group?: Group }>(buildGroupDetailPath(id));
  return parseGroupDetail(raw);
}

export async function getGroupMembers(
  groupId: string,
  params?: GroupMembersParams,
): Promise<GroupMembersResult> {
  const raw = await clientApiJson<Record<string, unknown>>(buildGroupMembersPath(groupId, params));
  return parseGroupMembers(raw, params?.limit ?? 50);
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const raw = await clientApiJson<{ group?: Group }>(API_ROUTES.GROUPS, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return parseGroupDetail(raw);
}

export async function updateGroup(id: string, patch: UpdateGroupInput): Promise<Group> {
  const raw = await clientApiJson<{ group?: Group }>(`${API_ROUTES.GROUPS}/${id}`, {
    body: JSON.stringify(patch),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  return parseGroupDetail(raw);
}

export async function deleteGroup(id: string) {
  await clientApiJson(`${API_ROUTES.GROUPS}/${id}`, { method: "DELETE" });
}

export type RemoveContactsFromGroupInput =
  | string[]
  | {
      memberFilter: { search?: string; sort?: string };
      excludePersonIds?: string[];
    };

export async function addContactsToGroup(
  groupId: string,
  contactIds: string[],
): Promise<{ addedCount?: number; skippedCount?: number }> {
  return clientApiJson(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
    body: JSON.stringify({ personIds: contactIds }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function removeContactsFromGroup(
  groupId: string,
  input: RemoveContactsFromGroupInput,
): Promise<{ removedCount?: number }> {
  const body = Array.isArray(input) ? { personIds: input } : input;
  return clientApiJson(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });
}

export async function duplicateGroup(
  sourceGroupId: string,
  input: CreateGroupInput,
): Promise<Group> {
  const members = await getGroupMembers(sourceGroupId, { limit: 200, offset: 0 });
  const created = await createGroup(input);

  const contactIds = members.contacts
    .map((contact) => contact.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (contactIds.length > 0) {
    await addContactsToGroup(created.id, contactIds);
  }

  return created;
}
