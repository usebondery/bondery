import { startTransition } from "react";
import { create } from "zustand";

const BULK_SELECTION_TRANSITION_THRESHOLD = 20;

export type DragSelectionIntent = "select" | "deselect";

function createExcludedWithMyself(myselfContactId: string | undefined): Set<string> {
  const excluded = new Set<string>();

  if (myselfContactId) {
    excluded.add(myselfContactId);
  }

  return excluded;
}

function countExcludedSelectable(excludedIds: Set<string>, myselfContactId: string | undefined): number {
  if (!myselfContactId) {
    return excludedIds.size;
  }

  return Array.from(excludedIds).filter((id) => id !== myselfContactId).length;
}

function createEmptySelectionState() {
  return {
    selectedIds: new Set<string>(),
    isAllTotalSelected: false,
    excludedIds: new Set<string>(),
  };
}

export interface ContactsSelectionState {
  isSelectionSessionActive: boolean;
  selectedIds: Set<string>;
  isAllTotalSelected: boolean;
  excludedIds: Set<string>;
  myselfContactId: string | undefined;
  totalCount: number;
  loadedContactCount: number;
  isDeleting: boolean;
  isOverflowSheetOpen: boolean;
  isDeleteConfirmOpen: boolean;
  isAddToGroupsSheetOpen: boolean;
  isAddingToGroups: boolean;
  isRemoveFromGroupConfirmOpen: boolean;
  isRemovingFromGroup: boolean;

  setMyselfContactId: (contactId: string | undefined) => void;
  setTotalCount: (count: number) => void;
  setLoadedContactCount: (count: number) => void;
  setIsDeleting: (deleting: boolean) => void;
  setOverflowSheetOpen: (open: boolean) => void;
  setDeleteConfirmOpen: (open: boolean) => void;
  setAddToGroupsSheetOpen: (open: boolean) => void;
  setIsAddingToGroups: (adding: boolean) => void;
  setRemoveFromGroupConfirmOpen: (open: boolean) => void;
  setIsRemovingFromGroup: (removing: boolean) => void;

  isSelected: (contactId: string) => boolean;
  getSelectionMode: () => boolean;
  getEffectiveSelectedCount: () => number;
  getSelectedContactIds: () => string[];
  getExcludedIds: () => string[];

  enterSelectionSession: (contactId: string) => void;
  toggleContact: (contactId: string) => void;
  selectAllTotal: () => void;
  deselectAllInSession: (options?: { useTransition?: boolean }) => void;
  exitSelectionMode: (options?: { useTransition?: boolean }) => void;
  applyDragSelection: (contactIds: string[], intent: DragSelectionIntent) => void;
  syncDragSelectionRange: (params: {
    rangeContactIds: string[];
    selectInRange: boolean;
    baseline: {
      isAllTotalSelected: boolean;
      selectedIds: Set<string>;
      excludedIds: Set<string>;
    };
  }) => void;
  pruneMyselfFromSelection: () => void;
  pruneSelectionToKnownContactIds: (knownContactIds: Set<string>) => void;
}

export const useContactsSelection = create<ContactsSelectionState>((set, get) => ({
  isSelectionSessionActive: false,
  selectedIds: new Set(),
  isAllTotalSelected: false,
  excludedIds: new Set(),
  myselfContactId: undefined,
  totalCount: 0,
  loadedContactCount: 0,
  isDeleting: false,
  isOverflowSheetOpen: false,
  isDeleteConfirmOpen: false,
  isAddToGroupsSheetOpen: false,
  isAddingToGroups: false,
  isRemoveFromGroupConfirmOpen: false,
  isRemovingFromGroup: false,

  setMyselfContactId: (contactId) => set({ myselfContactId: contactId }),

  setTotalCount: (count) => set({ totalCount: count }),

  setLoadedContactCount: (count) => set({ loadedContactCount: count }),

  setIsDeleting: (isDeleting) => set({ isDeleting }),

  setOverflowSheetOpen: (open) => set({ isOverflowSheetOpen: open }),

  setDeleteConfirmOpen: (open) => set({ isDeleteConfirmOpen: open }),

  setAddToGroupsSheetOpen: (open) => set({ isAddToGroupsSheetOpen: open }),

  setIsAddingToGroups: (isAddingToGroups) => set({ isAddingToGroups }),

  setRemoveFromGroupConfirmOpen: (open) => set({ isRemoveFromGroupConfirmOpen: open }),

  setIsRemovingFromGroup: (isRemovingFromGroup) => set({ isRemovingFromGroup }),

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

  getSelectionMode: () => get().isSelectionSessionActive,

  getEffectiveSelectedCount: () => {
    const state = get();

    if (state.isAllTotalSelected) {
      return Math.max(0, state.totalCount - countExcludedSelectable(state.excludedIds, state.myselfContactId));
    }

    if (!state.myselfContactId) {
      return state.selectedIds.size;
    }

    return Array.from(state.selectedIds).filter((id) => id !== state.myselfContactId).length;
  },

  getSelectedContactIds: () => {
    const state = get();
    const myselfId = state.myselfContactId;

    return Array.from(state.selectedIds).filter((id) => id !== myselfId);
  },

  getExcludedIds: () => Array.from(get().excludedIds),

  enterSelectionSession: (contactId) => {
    const state = get();

    if (contactId === state.myselfContactId) {
      return;
    }

    set({
      isSelectionSessionActive: true,
      isAllTotalSelected: false,
      excludedIds: new Set(),
      selectedIds: new Set([contactId]),
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

  selectAllTotal: () => {
    const state = get();

    set({
      isSelectionSessionActive: true,
      isAllTotalSelected: true,
      excludedIds: createExcludedWithMyself(state.myselfContactId),
      selectedIds: new Set(),
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

  exitSelectionMode: (options) => {
    const applyExit = () => {
      set({
        ...createEmptySelectionState(),
        isSelectionSessionActive: false,
        isOverflowSheetOpen: false,
        isDeleteConfirmOpen: false,
        isAddToGroupsSheetOpen: false,
        isAddingToGroups: false,
        isRemoveFromGroupConfirmOpen: false,
        isRemovingFromGroup: false,
      });
    };

    if (options?.useTransition) {
      startTransition(applyExit);
      return;
    }

    applyExit();
  },

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
        isSelectionSessionActive: true,
        isAllTotalSelected: true,
        excludedIds: nextExcluded,
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
      isSelectionSessionActive: nextSelected.size > 0,
      isAllTotalSelected: false,
      excludedIds: new Set(),
      selectedIds: nextSelected,
    });
  },

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
          Array.from(current.excludedIds).filter((id) => knownContactIds.has(id) || id === current.myselfContactId),
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
