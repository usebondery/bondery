import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { CreateGroupInput, Group, UpdateGroupInput } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  buildGroupMembersPath,
  type GroupMembersParams,
} from "@/lib/query/fetchers/groups";

export async function listGroups(path: string) {
  return clientApiJson<{ groups?: Group[]; totalCount?: number }>(path);
}

export async function getGroup(id: string) {
  return clientApiJson<{ group?: Group }>(`${API_ROUTES.GROUPS}/${id}`);
}

export async function createGroup(input: CreateGroupInput) {
  return clientApiJson<{ group?: Group }>(API_ROUTES.GROUPS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateGroup(id: string, patch: UpdateGroupInput) {
  return clientApiJson<{ group?: Group }>(`${API_ROUTES.GROUPS}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personIds: contactIds }),
  });
}

export async function removeContactsFromGroup(
  groupId: string,
  input: RemoveContactsFromGroupInput,
): Promise<{ removedCount?: number }> {
  const body = Array.isArray(input) ? { personIds: input } : input;
  return clientApiJson(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listGroupMembers(groupId: string, params?: GroupMembersParams) {
  return clientApiJson<{ contacts?: unknown[]; totalCount?: number }>(
    buildGroupMembersPath(groupId, params),
  );
}

export async function duplicateGroup(
  sourceGroupId: string,
  input: CreateGroupInput,
): Promise<Group> {
  const members = await listGroupMembers(sourceGroupId, { limit: 200, offset: 0 });
  const created = await createGroup(input);
  if (!created.group?.id) {
    throw new Error("Group was created but response did not include group");
  }

  const contactIds = (members.contacts ?? [])
    .map((contact) => (contact as { id?: string }).id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (contactIds.length > 0) {
    await addContactsToGroup(created.group.id, contactIds);
  }

  return created.group;
}
