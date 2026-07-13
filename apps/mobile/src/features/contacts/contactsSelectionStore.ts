import { startTransition } from "react";
import { create } from "zustand";

const _BULK_SELECTION_TRANSITION_THRESHOLD = 20;

export type DragSelectionIntent = "select" | "deselect";

function createExcludedWithMyself(myselfContactId: string | undefined): Set<string> {
  const excluded = new Set<string>();

  if (myselfContactId) {
    excluded.add(myselfContactId);
  }

  return excluded;
}

function countExcludedSelectable(
  excludedIds: Set<string>,
  myselfContactId: string | undefined,
): number {
  if (!myselfContactId) {
    return excludedIds.size;
  }

  return Array.from(excludedIds).filter((id) => id !== myselfContactId).length;
}

function createEmptySelectionState() {
  return {
    excludedIds: new Set<string>(),
    isAllTotalSelected: false,
    selectedIds: new Set<string>(),
  };
}

export interface ContactsSelectionState {
  applyDragSelection: (contactIds: string[], intent: DragSelectionIntent) => void;
  deselectAllInSession: (options?: { useTransition?: boolean }) => void;

  enterSelectionSession: (contactId: string) => void;
  excludedIds: Set<string>;
  exitSelectionMode: (options?: { useTransition?: boolean }) => void;
  getEffectiveSelectedCount: () => number;
  getExcludedIds: () => string[];
  getSelectedContactIds: () => string[];
  getSelectionMode: () => boolean;
  isAddingToGroups: boolean;
  isAddToGroupsSheetOpen: boolean;
  isAllTotalSelected: boolean;
  isDeleteConfirmOpen: boolean;
  isDeleting: boolean;
  isOverflowSheetOpen: boolean;
  isRemoveFromGroupConfirmOpen: boolean;
  isRemovingFromGroup: boolean;

  isSelected: (contactId: string) => boolean;
  isSelectionSessionActive: boolean;
  loadedContactCount: number;
  myselfContactId: string | undefined;
  pruneMyselfFromSelection: () => void;
  pruneSelectionToKnownContactIds: (knownContactIds: Set<string>) => void;
  selectAllTotal: () => void;
  selectedIds: Set<string>;
  setAddToGroupsSheetOpen: (open: boolean) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  setIsAddingToGroups: (adding: boolean) => void;
  setIsDeleting: (deleting: boolean) => void;
  setIsRemovingFromGroup: (removing: boolean) => void;
  setLoadedContactCount: (count: number) => void;

  setMyselfContactId: (contactId: string | undefined) => void;
  setOverflowSheetOpen: (open: boolean) => void;
  setRemoveFromGroupConfirmOpen: (open: boolean) => void;
  setTotalCount: (count: number) => void;
  syncDragSelectionRange: (params: {
    rangeContactIds: string[];
    selectInRange: boolean;
    baseline: {
      isAllTotalSelected: boolean;
      selectedIds: Set<string>;
      excludedIds: Set<string>;
    };
  }) => void;
  toggleContact: (contactId: string) => void;
  totalCount: number;
}

export const useContactsSelection = create<ContactsSelectionState>((set, get) => ({
  applyDragSelection: (contactIds, intent) => {
    if (contactIds.length === 0) {
      return;
    }

    const state = get();
    const selectableIds = contactIds.filter((id) => id !== state.myselfContactId);

    if (selectableIds.length === 0) {
      return;
    }

    if (state.isAllTotalSelected) {
      set((current) => {
        const nextExcluded = new Set(current.excludedIds);

        for (const contactId of selectableIds) {
          if (intent === "select") {
            nextExcluded.delete(contactId);
          } else {
            nextExcluded.add(contactId);
          }
        }

        const selectableExclusions = countExcludedSelectable(nextExcluded, current.myselfContactId);

        if (selectableExclusions >= current.totalCount) {
          return {
            ...createEmptySelectionState(),
            isSelectionSessionActive: current.isSelectionSessionActive,
          };
        }

        return { excludedIds: nextExcluded };
      });
      return;
    }

    set((current) => {
      const nextSelected = new Set(current.selectedIds);

      for (const contactId of selectableIds) {
        if (intent === "select") {
          nextSelected.add(contactId);
        } else {
          nextSelected.delete(contactId);
        }
      }

      return { selectedIds: nextSelected };
    });
  },

  deselectAllInSession: (options) => {
    const applyDeselect = () => {
      set((current) => ({
        ...createEmptySelectionState(),
        isSelectionSessionActive: current.isSelectionSessionActive,
      }));
    };

    if (options?.useTransition) {
      startTransition(applyDeselect);
      return;
    }

    applyDeselect();
  },

  enterSelectionSession: (contactId) => {
    const state = get();

    if (contactId === state.myselfContactId) {
      return;
    }

    set({
      excludedIds: new Set(),
      isAllTotalSelected: false,
      isSelectionSessionActive: true,
      selectedIds: new Set([contactId]),
    });
  },
  excludedIds: new Set(),

  exitSelectionMode: (options) => {
    const applyExit = () => {
      set({
        ...createEmptySelectionState(),
        isAddingToGroups: false,
        isAddToGroupsSheetOpen: false,
        isDeleteConfirmOpen: false,
        isOverflowSheetOpen: false,
        isRemoveFromGroupConfirmOpen: false,
        isRemovingFromGroup: false,
        isSelectionSessionActive: false,
      });
    };

    if (options?.useTransition) {
      startTransition(applyExit);
      return;
    }

    applyExit();
  },

  getEffectiveSelectedCount: () => {
    const state = get();

    if (state.isAllTotalSelected) {
      return Math.max(
        0,
        state.totalCount - countExcludedSelectable(state.excludedIds, state.myselfContactId),
      );
    }

    if (!state.myselfContactId) {
      return state.selectedIds.size;
    }

    return Array.from(state.selectedIds).filter((id) => id !== state.myselfContactId).length;
  },

  getExcludedIds: () => Array.from(get().excludedIds),

  getSelectedContactIds: () => {
    const state = get();
    const myselfId = state.myselfContactId;

    return Array.from(state.selectedIds).filter((id) => id !== myselfId);
  },

  getSelectionMode: () => get().isSelectionSessionActive,
  isAddingToGroups: false,
  isAddToGroupsSheetOpen: false,
  isAllTotalSelected: false,
  isDeleteConfirmOpen: false,
  isDeleting: false,
  isOverflowSheetOpen: false,
  isRemoveFromGroupConfirmOpen: false,
  isRemovingFromGroup: false,

  isSelected: (contactId) => {
    const state = get();

    if (contactId === state.myselfContactId) {
      return false;
    }

    if (state.isAllTotalSelected) {
      return !state.excludedIds.has(contactId);
    }

    return state.selectedIds.has(contactId);
  },
  isSelectionSessionActive: false,
  loadedContactCount: 0,
  myselfContactId: undefined,

  pruneMyselfFromSelection: () => {
    const { myselfContactId, selectedIds } = get();

    if (!myselfContactId || !selectedIds.has(myselfContactId)) {
      return;
    }

    set((current) => {
      const next = new Set(current.selectedIds);
      next.delete(myselfContactId);
      return { selectedIds: next };
    });
  },

  pruneSelectionToKnownContactIds: (knownContactIds) => {
    set((current) => {
      if (current.isAllTotalSelected) {
        const nextExcluded = new Set(
          Array.from(current.excludedIds).filter(
            (id) => knownContactIds.has(id) || id === current.myselfContactId,
          ),
        );

        return { excludedIds: nextExcluded };
      }

      const nextSelected = new Set(
        Array.from(current.selectedIds).filter((id) => knownContactIds.has(id)),
      );

      if (nextSelected.size === current.selectedIds.size) {
        return current;
      }

      return { selectedIds: nextSelected };
    });
  },

  selectAllTotal: () => {
    const state = get();

    set({
      excludedIds: createExcludedWithMyself(state.myselfContactId),
      isAllTotalSelected: true,
      isSelectionSessionActive: true,
      selectedIds: new Set(),
    });
  },
  selectedIds: new Set(),

  setAddToGroupsSheetOpen: (open) => set({ isAddToGroupsSheetOpen: open }),

  setDeleteConfirmOpen: (open) => set({ isDeleteConfirmOpen: open }),

  setIsAddingToGroups: (isAddingToGroups) => set({ isAddingToGroups }),

  setIsDeleting: (isDeleting) => set({ isDeleting }),

  setIsRemovingFromGroup: (isRemovingFromGroup) => set({ isRemovingFromGroup }),

  setLoadedContactCount: (count) => set({ loadedContactCount: count }),

  setMyselfContactId: (contactId) => set({ myselfContactId: contactId }),

  setOverflowSheetOpen: (open) => set({ isOverflowSheetOpen: open }),

  setRemoveFromGroupConfirmOpen: (open) => set({ isRemoveFromGroupConfirmOpen: open }),

  setTotalCount: (count) => set({ totalCount: count }),

  syncDragSelectionRange: ({ rangeContactIds, selectInRange, baseline }) => {
    const state = get();
    const myselfId = state.myselfContactId;
    const filteredRangeIds = rangeContactIds.filter((id) => id !== myselfId);

    if (baseline.isAllTotalSelected) {
      const nextExcluded = new Set(baseline.excludedIds);

      for (const contactId of filteredRangeIds) {
        if (selectInRange) {
          nextExcluded.delete(contactId);
        } else {
          nextExcluded.add(contactId);
        }
      }

      const selectableExclusions = countExcludedSelectable(nextExcluded, myselfId);

      if (selectableExclusions >= state.totalCount) {
        set({
          ...createEmptySelectionState(),
          isSelectionSessionActive: state.isSelectionSessionActive,
        });
        return;
      }

      set({
        excludedIds: nextExcluded,
        isAllTotalSelected: true,
        isSelectionSessionActive: true,
        selectedIds: new Set(),
      });
      return;
    }

    const nextSelected = new Set(baseline.selectedIds);

    for (const contactId of filteredRangeIds) {
      if (selectInRange) {
        nextSelected.add(contactId);
      } else {
        nextSelected.delete(contactId);
      }
    }

    set({
      excludedIds: new Set(),
      isAllTotalSelected: false,
      isSelectionSessionActive: nextSelected.size > 0,
      selectedIds: nextSelected,
    });
  },

  toggleContact: (contactId) => {
    const state = get();

    if (contactId === state.myselfContactId) {
      return;
    }

    if (state.isAllTotalSelected) {
      set((current) => {
        const nextExcluded = new Set(current.excludedIds);

        if (nextExcluded.has(contactId)) {
          nextExcluded.delete(contactId);
        } else {
          nextExcluded.add(contactId);
        }

        const selectableExclusions = countExcludedSelectable(nextExcluded, current.myselfContactId);

        if (selectableExclusions >= current.totalCount) {
          return {
            ...createEmptySelectionState(),
            isSelectionSessionActive: current.isSelectionSessionActive,
          };
        }

        return { excludedIds: nextExcluded };
      });
      return;
    }

    set((current) => {
      const nextSelected = new Set(current.selectedIds);

      if (nextSelected.has(contactId)) {
        nextSelected.delete(contactId);
      } else {
        nextSelected.add(contactId);
      }

      return { selectedIds: nextSelected };
    });
  },
  totalCount: 0,
}));

/** Row-level subscription: re-renders only when this contact's selected state changes. */
export function useContactIsSelected(contactId: string): boolean {
  return useContactsSelection((state) => {
    if (contactId === state.myselfContactId) {
      return false;
    }

    if (state.isAllTotalSelected) {
      return !state.excludedIds.has(contactId);
    }

    return state.selectedIds.has(contactId);
  });
}

/** Shared by rows: re-renders when selection session starts or ends. */
export function useContactsSelectionMode(): boolean {
  return useContactsSelection((state) => state.isSelectionSessionActive);
}

export function useContactsEffectiveSelectedCount(): number {
  return useContactsSelection((state) => {
    if (state.isAllTotalSelected) {
      return Math.max(
        0,
        state.totalCount - countExcludedSelectable(state.excludedIds, state.myselfContactId),
      );
    }

    if (!state.myselfContactId) {
      return state.selectedIds.size;
    }

    return Array.from(state.selectedIds).filter((id) => id !== state.myselfContactId).length;
  });
}
