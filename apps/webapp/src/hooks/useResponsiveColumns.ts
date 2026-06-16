"use client";

import { type RefObject, useEffect, useMemo, useState } from "react";
import type {
  ColumnConfig,
  ColumnKey,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";

/**
 * Column keys ordered from lowest priority (first to hide) to highest priority (last to hide).
 * The `name` column is fixed and never participates in auto-hiding.
 */
const RESPONSIVE_HIDE_ORDER: ColumnKey[] = [
  "phone",
  "email",
  "social",
  "location",
  "lastInteraction",
  "headline",
];

interface ResponsiveBreakpoint {
  /** Minimum container width in pixels for this rule to apply */
  minWidth: number;
  /** Maximum number of optional (non-fixed) columns allowed at this width */
  maxOptionalColumns: number;
}

const DEFAULT_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { minWidth: 736, maxOptionalColumns: Infinity },
  { minWidth: 640, maxOptionalColumns: 3 },
  { minWidth: 544, maxOptionalColumns: 2 },
  { minWidth: 448, maxOptionalColumns: 1 },
  { minWidth: 0, maxOptionalColumns: 0 },
];

const DEFAULT_STORAGE_KEY = "bondery_contacts_pinned_columns";

interface UseResponsiveColumnsOptions {
  /**
   * Custom breakpoint thresholds. Defaults to the contacts table breakpoints.
   * Each entry describes the max number of optional columns to show when the
   * container is at least `minWidth` pixels wide.
   */
  breakpoints?: ResponsiveBreakpoint[];
  /**
   * localStorage key used to persist user-pinned column keys.
   * Defaults to "bondery_contacts_pinned_columns".
   */
  localStorageKey?: string;
}

interface UseResponsiveColumnsResult {
  /** Column configs with `visible` adjusted for the current container width */
  effectiveColumns: ColumnConfig[];
  /**
   * Updates the pinned keys set and persists to localStorage.
   * Call this when the user explicitly shows or hides a column via the menu.
   */
  onColumnsChange: (nextColumns: ColumnConfig[]) => void;
}

/**
 * Observes the width of a container element and automatically hides lower-priority
 * columns when space is insufficient, restoring them as the container grows.
 *
 * Columns in `pinnedKeys` (user explicitly turned on via the menu) are never auto-hidden.
 *
 * @param containerRef Ref attached to the element whose width controls column visibility
 * @param columns Current column configs (the user's state — not yet responsive-adjusted)
 * @param options Optional configuration overrides
 */
export function useResponsiveColumns(
  containerRef: RefObject<HTMLElement | null>,
  columns: ColumnConfig[],
  options?: UseResponsiveColumnsOptions,
): UseResponsiveColumnsResult {
  const breakpoints = options?.breakpoints ?? DEFAULT_BREAKPOINTS;
  const storageKey = options?.localStorageKey ?? DEFAULT_STORAGE_KEY;

  // Start with Infinity so the first render (before ResizeObserver fires) shows all columns,
  // matching the server-rendered HTML and preventing a flash of missing columns.
  const [containerWidth, setContainerWidth] = useState<number>(Infinity);

  // Load pinned keys from localStorage on mount. Keys not in RESPONSIVE_HIDE_ORDER
  // are discarded to guard against stale/corrupted storage data.
  const [pinnedKeys, setPinnedKeysState] = useState<Set<ColumnKey>>(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (!raw) return new Set();
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      const valid = parsed.filter(
        (k): k is ColumnKey =>
          typeof k === "string" &&
          (RESPONSIVE_HIDE_ORDER as string[]).includes(k),
      );
      return new Set(valid);
    } catch {
      return new Set();
    }
  });

  // Persist pinned keys whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(pinnedKeys)));
    } catch {
      // localStorage unavailable (private mode, storage full, etc.) — fail silently
    }
  }, [pinnedKeys, storageKey]);

  // Attach ResizeObserver to the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width =
        entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      setContainerWidth(width);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  // Derive which columns to auto-hide based on container width
  const autoHiddenKeys = useMemo<Set<ColumnKey>>(() => {
    // Find active breakpoint (highest minWidth that is <= containerWidth)
    const active = breakpoints
      .slice()
      .sort((a, b) => b.minWidth - a.minWidth)
      .find((bp) => containerWidth >= bp.minWidth);

    const maxOptional = active?.maxOptionalColumns ?? 0;

    // Candidates: user-visible, non-fixed columns that participate in responsive hiding
    const candidates = columns.filter(
      (col) =>
        col.visible &&
        !col.fixed &&
        (RESPONSIVE_HIDE_ORDER as string[]).includes(col.key),
    );

    const candidateCount = candidates.length;
    const toHideCount = Math.max(0, candidateCount - maxOptional);

    if (toHideCount === 0) return new Set();

    // Sort candidates by hide priority (lowest priority first = first to hide)
    const sorted = [...candidates].sort(
      (a, b) =>
        RESPONSIVE_HIDE_ORDER.indexOf(a.key) -
        RESPONSIVE_HIDE_ORDER.indexOf(b.key),
    );

    const toHide = new Set<ColumnKey>();
    for (const col of sorted) {
      if (toHide.size >= toHideCount) break;
      // Never auto-hide a column the user has explicitly pinned
      if (!pinnedKeys.has(col.key)) {
        toHide.add(col.key);
      }
    }

    return toHide;
  }, [columns, containerWidth, breakpoints, pinnedKeys]);

  // Build effective columns: apply responsive hiding on top of user visibility
  const effectiveColumns = useMemo<ColumnConfig[]>(
    () =>
      columns.map((col) => ({
        ...col,
        visible: col.visible && !autoHiddenKeys.has(col.key),
      })),
    [columns, autoHiddenKeys],
  );

  /**
   * Called when the user changes column visibility via the menu.
   * Compares old vs new to update the pinned keys set:
   * - Column turned on  → add to pinned (never auto-hide it again)
   * - Column turned off → remove from pinned (allow auto-hiding in future)
   */
  const onColumnsChange = (nextColumns: ColumnConfig[]) => {
    setPinnedKeysState((prev) => {
      const next = new Set(prev);
      for (const col of nextColumns) {
        if (!(RESPONSIVE_HIDE_ORDER as string[]).includes(col.key)) continue;
        const key = col.key;
        const before = effectiveColumns.find((c) => c.key === key);
        const wasVisible = before?.visible ?? false;
        const isNowVisible = col.visible;
        if (!wasVisible && isNowVisible) {
          next.add(key);
        } else if (wasVisible && !isNowVisible) {
          next.delete(key);
        }
      }
      return next;
    });
  };

  return { effectiveColumns, onColumnsChange };
}
