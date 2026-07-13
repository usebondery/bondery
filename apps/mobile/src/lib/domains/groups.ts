import type { Contact, Group, GroupWithCount } from "@bondery/schemas";
import { generateUuid } from "../sync/ids";
import { submitSyncMutation } from "../sync/mutation-service";
import {
  getGroup as getGroupFromRepo,
  listGroupContacts,
  listGroups as listGroupsFromRepo,
} from "../sync/repositories/groups";

function newId(): string {
  return generateUuid();
}

export function listGroups(): GroupWithCount[] {
  return listGroupsFromRepo();
}

export function getGroup(groupId: string): Group | null {
  return getGroupFromRepo(groupId);
}

export function listGroupMembers(options: {
  groupId: string;
  query?: string;
  limit: number;
  offset: number;
}): { contacts: Contact[]; totalCount: number } {
  return listGroupContacts(options);
}

export function createGroup(input: {
  label: string;
  emoji: string;
  color: string;
  id?: string;
}): Group {
  const id = input.id ?? newId();
  submitSyncMutation({
    payload: { color: input.color, emoji: input.emoji, id, label: input.label },
    type: "group.create",
  });
  const group = getGroup(id);
  if (!group) {
    throw new Error(`Group not found after create: ${id}`);
  }
  return group;
}

export function updateGroup(
  groupId: string,
  input: Partial<{ label: string; emoji: string; color: string }>,
): Group {
  submitSyncMutation({
    entityId: groupId,
    payload: input,
    type: "group.update",
  });
  const group = getGroup(groupId);
  if (!group) {
    throw new Error(`Group not found after update: ${groupId}`);
  }
  return group;
}

export function deleteGroup(groupId: string): void {
  submitSyncMutation({
    entityId: groupId,
    payload: {},
    type: "group.delete",
  });
}

export function addContactsToGroup(groupId: string, personIds: string[]): void {
  submitSyncMutation({
    entityId: groupId,
    payload: { personIds },
    type: "group.addMembers",
  });
}

export function removeContactsFromGroup(groupId: string, personIds: string[]): void {
  submitSyncMutation({
    entityId: groupId,
    payload: { personIds },
    type: "group.removeMembers",
  });
}

/** @deprecated Use named exports (`createGroup`, `listGroups`, …). */
export const groupsDomain = {
  addMembers: addContactsToGroup,
  create: createGroup,
  delete: deleteGroup,
  get: getGroup,
  list: listGroups,
  listMembers: listGroupMembers,
  removeMembers: removeContactsFromGroup,
  update: updateGroup,
};
