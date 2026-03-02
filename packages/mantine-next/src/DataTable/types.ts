import type { ReactNode } from "react";

/**
 * Configuration for a data table column.
 * @template TRow The type of data items in the table
 */
export interface DataColumnConfig<TRow> {
  /** Unique identifier for the column */
  key: string;
  /** Display label for the column header */
  label: string;
  /** Optional icon shown in column header */
  icon?: ReactNode;
  /** Whether the column is currently visible */
  visible: boolean;
  /** If true, column cannot be hidden or reordered */
  fixed?: boolean;
  /** Min-width CSS class (e.g., "min-w-40") */
  minWidthClass?: string;
  /** Custom render function for cell content */
  render: (row: TRow, rowIndex: number) => ReactNode;
}

/**
 * Configuration for a sort option in the sort menu.
 */
export interface SortOption<TSortKey extends string = string> {
  /** Unique key identifying this sort option */
  key: TSortKey;
  /** Display label for the sort option */
  label: string;
}

/**
 * Configuration for a row action in the actions menu.
 * @template TRow The type of data items in the table
 */
export interface RowAction<TRow> {
  /** Unique key identifying this action */
  key: string;
  /** Display label for the action */
  label: string;
  /** Icon shown next to the label */
  icon?: ReactNode;
  /** Color for the action (e.g., "red" for delete) */
  color?: string;
  /** Callback when action is triggered */
  onClick: (row: TRow) => void;
}

/**
 * Configuration for a bulk action button.
 */
export interface BulkAction {
  /** Unique key identifying this action */
  key: string;
  /** Display label for the action button */
  label: string;
  /** Icon shown in the button */
  icon?: ReactNode;
  /** Color for the button */
  color?: string;
  /** Button variant */
  variant?: "filled" | "light" | "outline" | "subtle" | "default";
  /** Callback when action is triggered with selected row IDs */
  onClick: (selectedIds: Set<string>) => void;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Tooltip shown when action is disabled */
  disabledTooltip?: string;
  /** Whether the action is loading */
  loading?: boolean;
}

/**
 * Labels interface for the column visibility menu.
 */
export interface ColumnVisibilityLabels {
  /** Button label (e.g., "Visible columns") */
  buttonLabel: string;
  /** Section header for visible columns */
  visibleSection: string;
  /** Section header for hidden columns */
  hiddenSection: string;
  /** Message when no visible columns */
  noVisible: string;
  /** Message when no hidden columns */
  noHidden: string;
}

/**
 * Labels interface for the sort menu.
 */
export interface SortMenuLabels {
  /** Button label (e.g., "Sort") */
  buttonLabel: string;
}

/**
 * All labels required by the DataTable component.
 */
export interface DataTableLabels {
  /** Placeholder text for search input */
  searchPlaceholder: string;
  /** Message shown when no data matches filters */
  emptyStateMessage: string;
  /** Aria label for row actions button */
  actionsAriaLabel?: string;
  /** Label for "Load more" button */
  loadMoreLabel?: string;
  /** Template for selected count (e.g., "{count} selected") */
  selectedCountTemplate?: string;
  /** Template for total count (e.g., "{count} total items") */
  totalCountTemplate?: string;
  /** Labels for column visibility menu */
  columnVisibility: ColumnVisibilityLabels;
  /** Labels for sort menu */
  sort: SortMenuLabels;
}
