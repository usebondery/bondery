import type { Group, GroupWithCount } from "@bondery/schemas";
import { create } from "zustand";

interface GroupsStoreState {
  byId: Record<string, GroupWithCount>;
  upsertGroup: (group: Group | GroupWithCount) => void;
  upsertGroups: (groups: Array<Group | GroupWithCount>) => void;
  removeGroup: (id: string) => void;
  clearAll: () => void;
}

function toGroupWithCount(
  group: Group | GroupWithCount,
  existing?: GroupWithCount,
): GroupWithCount {
  return {
    ...group,
    contactCount: "contactCount" in group ? group.contactCount : existing?.contactCount ?? 0,
  };
}

export const useGroupsStore = create<GroupsStoreState>()((set) => ({
  byId: {},
  upsertGroup: (group) =>
    set((state) => ({
      byId: {
        ...state.byId,
        [group.id]: toGroupWithCount(group, state.byId[group.id]),
      },
    })),
  upsertGroups: (groups) =>
    set((state) => {
      if (groups.length === 0) {
        return state;
      }

      const nextById = { ...state.byId };
      for (const group of groups) {
        nextById[group.id] = toGroupWithCount(group, nextById[group.id]);
      }

      return { byId: nextById };
    }),
  removeGroup: (id) =>
    set((state) => ({
      byId: Object.fromEntries(
        Object.entries(state.byId).filter(([groupId]) => groupId !== id),
      ),
    })),
  clearAll: () => set({ byId: {} }),
}));
