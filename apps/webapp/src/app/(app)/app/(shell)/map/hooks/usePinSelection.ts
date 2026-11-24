"use client";

import type { MapPin } from "@bondery/schemas";
import { useCallback, useState } from "react";

interface UsePinSelectionOptions {
  /** Pins in the current search and sort order; the range and select-all source. */
  filteredPins: MapPin[];
}

function toggleSelection(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

interface RangeSelectionOptions {
  current: Set<string>;
  currentIndex: number;
  filteredPins: MapPin[];
  id: string;
  lastSelectedIndex: number;
}

/** Shift-click: select or clear every pin between the last click and this one. */
function nextRangeSelection({
  current,
  currentIndex,
  filteredPins,
  id,
  lastSelectedIndex,
}: RangeSelectionOptions): Set<string> {
  const start = Math.min(lastSelectedIndex, currentIndex);
  const end = Math.max(lastSelectedIndex, currentIndex);
  const next = new Set(current);
  const shouldSelect = !current.has(id);
  for (const pin of filteredPins.slice(start, end + 1)) {
    if (shouldSelect) {
      next.add(pin.id);
    } else {
      next.delete(pin.id);
    }
  }
  return next;
}

/**
 * Row selection for the pins table: select all, toggle one, and shift-click ranges.
 * Each table view mounts its own instance, so a view switch starts with nothing selected.
 */
export function usePinSelection({ filteredPins }: UsePinSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((current) =>
      current.size === filteredPins.length ? new Set() : new Set(filteredPins.map((pin) => pin.id)),
    );
  }, [filteredPins]);

  const handleSelectOne = useCallback(
    (id: string, options?: { shiftKey?: boolean; index?: number }) => {
      const currentIndex = options?.index ?? filteredPins.findIndex((pin) => pin.id === id);
      const isRange = Boolean(options?.shiftKey) && lastSelectedIndex !== null && currentIndex >= 0;

      setSelectedIds((current) =>
        isRange
          ? nextRangeSelection({
              current,
              currentIndex,
              filteredPins,
              id,
              lastSelectedIndex: lastSelectedIndex as number,
            })
          : toggleSelection(current, id),
      );

      if (currentIndex >= 0) {
        setLastSelectedIndex(currentIndex);
      }
    },
    [filteredPins, lastSelectedIndex],
  );

  const allSelected = filteredPins.length > 0 && selectedIds.size === filteredPins.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredPins.length;

  return {
    allSelected,
    clear,
    handleSelectAll,
    handleSelectOne,
    selectedIds,
    someSelected,
  };
}
