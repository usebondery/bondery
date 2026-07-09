"use client";

import type { Contact } from "@bondery/schemas";
import { useCallback, useMemo, useRef } from "react";

interface UseImportContactSelectionParams {
  nonSelectableIds: Set<string>;
  previewContacts: Contact[];
  selectableIds: string[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function useImportContactSelection({
  previewContacts,
  nonSelectableIds,
  selectableIds,
  selectedIds,
  setSelectedIds,
}: UseImportContactSelectionParams) {
  const lastSelectedIndexRef = useRef<number | null>(null);

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(selectableIds));
  }, [allSelected, selectableIds, setSelectedIds]);

  const handleToggleOne = useCallback(
    (id: string, options?: { shiftKey?: boolean; index?: number }) => {
      if (nonSelectableIds.has(id)) {
        return;
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);

        const rowIndex = options?.index;
        const hasRangeSelection =
          options?.shiftKey &&
          typeof rowIndex === "number" &&
          lastSelectedIndexRef.current !== null;

        if (hasRangeSelection && typeof rowIndex === "number") {
          const anchorIndex = lastSelectedIndexRef.current;
          if (anchorIndex === null) {
            return prev;
          }
          const start = Math.min(anchorIndex, rowIndex);
          const end = Math.max(anchorIndex, rowIndex);

          for (let index = start; index <= end; index += 1) {
            const row = previewContacts[index];
            if (!row || nonSelectableIds.has(row.id)) {
              continue;
            }

            next.add(row.id);
          }
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });

      if (typeof options?.index === "number") {
        lastSelectedIndexRef.current = options.index;
      }
    },
    [nonSelectableIds, previewContacts, setSelectedIds],
  );

  const resetSelectionAnchor = useCallback(() => {
    lastSelectedIndexRef.current = null;
  }, []);

  return useMemo(
    () => ({
      allSelected,
      handleToggleAll,
      handleToggleOne,
      resetSelectionAnchor,
      someSelected,
    }),
    [allSelected, handleToggleAll, handleToggleOne, resetSelectionAnchor, someSelected],
  );
}
