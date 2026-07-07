import type { Group } from "@bondery/schemas";
import { submitSyncMutation } from "../sync/mutation-service";
import { generateUuid } from "../sync/ids";
import { getGroup, listGroupContacts, listGroups } from "../sync/repositories/groups";

function newId(): string {
  return generateUuid();
}

export const groupsDomain = {
  list: listGroups,
  get: getGroup,
  listMembers: listGroupContacts,

  create(input: { label: string; emoji: string; color: string; id?: string }): Group {
    const id = input.id ?? newId();
    submitSyncMutation({
      type: "group.create",
      payload: { id, label: input.label, emoji: input.emoji, color: input.color },
    });
    return getGroup(id)!;
  },

  update(
    groupId: string,
    input: Partial<{ label: string; emoji: string; color: string }>,
  ): Group {
    submitSyncMutation({
      type: "group.update",
      entityId: groupId,
      payload: input,
    });
    return getGroup(groupId)!;
  },

  delete(groupId: string): void {
    submitSyncMutation({
      type: "group.delete",
      entityId: groupId,
      payload: {},
    });
  },

  addMembers(groupId: string, personIds: string[]): void {
    submitSyncMutation({
      type: "group.addMembers",
      entityId: groupId,
      payload: { personIds },
    });
  },

  removeMembers(groupId: string, personIds: string[]): void {
    submitSyncMutation({
      type: "group.removeMembers",
      entityId: groupId,
      payload: { personIds },
    });
  },
};
