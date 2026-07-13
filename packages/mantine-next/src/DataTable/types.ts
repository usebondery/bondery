import type { ReactNode } from "react";

/**
 * Configuration for a data table column.
 * @template TRow The type of data items in the table
 */
export interface DataColumnConfig<TRow> {
  /** If true, column cannot be hidden or reordered */
  fixed?: boolean;
  /** If true, the column header label and icon are not rendered */
  hideHeader?: boolean;
  /** Optional icon shown in column header */
  icon?: ReactNode;
  /** Unique identifier for the column */
  key: string;
  /** Display label for the column header */
  label: string;
  /** Min-width CSS class (e.g., "min-w-40") */
  minWidthClass?: string;
  /** Custom render function for cell content */
  render: (row: TRow, rowIndex: number) => ReactNode;
  /** Whether the column is currently visible */
  visible: boolean;
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
  /** Color for the action (e.g., "red" for delete) */
  color?: string;
  /** When true, the action is rendered as disabled */
  disabled?: (row: TRow) => boolean;
  /** Tooltip shown when hovering over a disabled action */
  disabledTooltip?: string;
  /** Icon shown next to the label */
  icon?: ReactNode;
  /** Unique key identifying this action */
  key: string;
  /** Display label for the action */
  label: string;
  /** Callback when action is triggered */
  onClick: (row: TRow) => void;
}

/**
 * Configuration for a bulk action button.
 */
export interface BulkAction {
  /** Color for the button */
  color?: string;
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Tooltip shown when action is disabled */
  disabledTooltip?: string;
  /** Icon shown in the button */
  icon?: ReactNode;
  /** Unique key identifying this action */
  key: string;
  /** Display label for the action button */
  label: string;
  /** Whether the action is loading */
  loading?: boolean;
  /** Callback when action is triggered with selected row IDs */
  onClick: (selectedIds: Set<string>) => void;
  /** Button variant */
  variant?: "filled" | "light" | "outline" | "subtle" | "default";
}

/**
 * Labels interface for the column visibility menu.
 */
export interface ColumnVisibilityLabels {
  /** Button label (e.g., "Visible columns") */
  buttonLabel: string;
  /** Section header for hidden columns */
  hiddenSection: string;
  /** Message when no hidden columns */
  noHidden: string;
  /** Message when no visible columns */
  noVisible: string;
  /** Section header for visible columns */
  visibleSection: string;
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
  /** Aria label for row actions button */
  actionsAriaLabel?: string;
  /** Template for "clear all" link shown when all pages are selected (e.g., "Clear selection ({count} people)") */
  clearAllTotalTemplate?: string;
  /** Labels for column visibility menu */
  columnVisibility: ColumnVisibilityLabels;
  /** Message shown when no data matches filters */
  emptyStateMessage: string;
  /** Label for "Load more" button */
  loadMoreLabel?: string;
  /** Placeholder text for search input */
  searchPlaceholder: string;
  /** Template for "select all" link (e.g., "Select all {count} people") */
  selectAllTotalTemplate?: string;
  /** Template for selected count (e.g., "{count} selected") */
  selectedCountTemplate?: string;
  /** Template for selected count when exactly 1 item is selected (e.g., "1 person selected") */
  selectedSingularCountTemplate?: string;
  /** Labels for sort menu */
  sort: SortMenuLabels;
  /** Template for total count (e.g., "{count} total items") */
  totalCountTemplate?: string;
}

export interface DataTableProps<TRow, TSortKey extends string = string> {
  /** Explicit all-selected state (compatibility mode) */
  allSelected?: boolean;

  // --- All-total selection ---
  /** When true, shows IconChecks in the header checkbox to indicate all items across all pages are selected */
  allTotalSelected?: boolean;

  // --- Bulk Actions ---
  /** Actions shown when items are selected */
  bulkActions?: BulkAction[];
  /** Additional class name for the table */
  className?: string;
  /** Column configurations with render functions */
  columns: DataColumnConfig<TRow>[];
  /** Currently selected sort key */
  currentSort?: TSortKey;
  /** Data rows to display */
  data: TRow[];
  /** Set of row IDs explicitly excluded from the "all total" selection */
  excludedIds?: Set<string>;
  /** Function to extract unique ID from each row */
  getRowId: (row: TRow) => string;
  /** Custom aria-label generator for row selection checkbox */
  getRowSelectionAriaLabel?: (row: TRow) => string;

  // --- Pagination ---
  /** Whether more data can be loaded */
  hasMore?: boolean;

  // --- Customization ---
  /** Custom header content to render after built-in controls */
  headerContent?: ReactNode;

  // --- Labels ---
  /** All localized labels */
  labels: DataTableLabels;
  /** Whether load more is in progress */
  loadMoreLoading?: boolean;
  /** Set of row IDs that cannot be selected */
  nonSelectableIds?: Set<string>;
  /** Tooltip shown on non-selectable rows */
  nonSelectableTooltip?: string;

  // --- Columns ---
  /** Callback when columns change (visibility/order) - enables column menu when provided */
  onColumnsChange?: (columns: DataColumnConfig<TRow>[]) => void;
  /** Callback to load more data */
  onLoadMore?: () => void;
  /** Callback when search value changes */
  onSearchChange?: (value: string) => void;
  /** Callback for toggling all rows (compatibility mode) */
  onSelectAll?: () => void;
  /** Callback to select all items across all pages */
  onSelectAllTotal?: () => void;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Callback for toggling one row (compatibility mode) */
  onSelectOne?: (id: string, options?: { shiftKey?: boolean; index?: number }) => void;
  /** Callback when sort changes */
  onSortChange?: (sortKey: TSortKey) => void;

  // --- Row Actions ---
  /** Actions shown in each row's menu */
  rowActions?: RowAction<TRow>[];
  /** Show loading indicator on search input */
  searchLoading?: boolean;

  // --- Search ---
  /** Search input value (enables search when onSearchChange provided) */
  searchValue?: string;

  // --- Selection ---
  /** Set of selected row IDs (enables selection when provided) */
  selectedIds?: Set<string>;

  // --- Layout ---
  /** Whether to show sticky header with controls */
  showHeader?: boolean;
  /** If true, show select all checkbox */
  showSelectAll?: boolean;
  /** Explicit some-selected state (compatibility mode) */
  someSelected?: boolean;

  // --- Sort ---
  /** Available sort options */
  sortOptions?: SortOption<TSortKey>[];
  /** Top offset for sticky header */
  stickyHeaderOffset?: number;
  /** Total number of items available (across all pages) */
  totalCount?: number;
}
