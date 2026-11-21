"use client";

import {
  IconBrandLinkedin,
  IconBriefcase,
  IconClock,
  IconMapPin,
  IconUser,
} from "@tabler/icons-react";
import {
  type ReactNode,
  type SetStateAction,
  useCallback,
  useDeferredValue,
  useState,
} from "react";
import type { ColumnConfig, ColumnKey } from "@/components/contacts/ContactsTableV2";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { MAP_TABLE_COLUMN_KEYS } from "../utils/mapConstants";

const COLUMN_ICONS: Record<ColumnKey, ReactNode> = {
  avatar: null,
  email: null,
  headline: <IconBriefcase size={16} />,
  lastInteraction: <IconClock size={16} />,
  location: <IconMapPin size={16} />,
  name: <IconUser size={16} />,
  phone: null,
  social: <IconBrandLinkedin size={16} />,
};

/** Columns that start hidden until the reader opens the column menu. */
const HIDDEN_BY_DEFAULT: ReadonlySet<ColumnKey> = new Set<ColumnKey>(["social"]);

/**
 * Labels come from `useContactsTableCopy` during render, so a locale change re-renders the labels
 * without an effect that copies them into state.
 */
export function useMapTableColumns() {
  const { columnDefinitions } = useContactsTableCopy();

  const [visibleByKey, setVisibleByKey] = useState<Record<ColumnKey, boolean>>(() =>
    buildDefaultVisibility(),
  );

  const columns: ColumnConfig[] = MAP_TABLE_COLUMN_KEYS.map((key) => ({
    fixed: key === "name",
    icon: COLUMN_ICONS[key],
    key,
    label: columnDefinitions[key].label,
    visible: visibleByKey[key],
  }));

  const setColumns = useCallback(
    (next: SetStateAction<ColumnConfig[]>) => {
      setVisibleByKey((previous) => mergeVisibility(next, previous, columns));
    },
    [columns],
  );

  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((column) => column.visible);

  return { columns, setColumns, visibleColumns };
}

function buildDefaultVisibility(): Record<ColumnKey, boolean> {
  const visibility = {} as Record<ColumnKey, boolean>;
  for (const key of MAP_TABLE_COLUMN_KEYS) {
    visibility[key] = !HIDDEN_BY_DEFAULT.has(key);
  }
  return visibility;
}

/** The column menu hands back the full list; only the visible flags belong in state. */
function mergeVisibility(
  next: SetStateAction<ColumnConfig[]>,
  previous: Record<ColumnKey, boolean>,
  columns: ColumnConfig[],
): Record<ColumnKey, boolean> {
  const resolved = typeof next === "function" ? next(columns) : next;
  const visibility = { ...previous };
  for (const column of resolved) {
    visibility[column.key] = column.visible;
  }
  return visibility;
}
