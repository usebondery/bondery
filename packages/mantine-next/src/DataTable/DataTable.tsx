"use client";

import { useState, type ReactNode } from "react";
import {
  ActionIcon,
  Button,
  ButtonGroup,
  Checkbox,
  Group,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { IconDotsVertical, IconSearch } from "@tabler/icons-react";
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";
import { SortMenu } from "./SortMenu";

/**
 * Isolated search input that owns its own local state.
 * Keeping state here prevents the parent DataTable (and all its rows)
 * from re-rendering on every keystroke.
 */
function SearchInput({
  initialValue,
  placeholder,
  onChange,
}: {
  initialValue: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <TextInput
      placeholder={placeholder}
      aria-label={placeholder}
      leftSection={<IconSearch size={16} />}
      value={value}
      onChange={(e) => {
        setValue(e.currentTarget.value);
        onChange(e.currentTarget.value);
      }}
      style={{ flex: 1 }}
    />
  );
}
import type { BulkAction, DataColumnConfig, DataTableLabels, RowAction, SortOption } from "./types";

export interface DataTableProps<TRow, TSortKey extends string = string> {
  /** Data rows to display */
  data: TRow[];
  /** Column configurations with render functions */
  columns: DataColumnConfig<TRow>[];
  /** Function to extract unique ID from each row */
  getRowId: (row: TRow) => string;

  // --- Selection ---
  /** Set of selected row IDs (enables selection when provided) */
  selectedIds?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Callback for toggling all rows (compatibility mode) */
  onSelectAll?: () => void;
  /** Callback for toggling one row (compatibility mode) */
  onSelectOne?: (id: string, options?: { shiftKey?: boolean; index?: number }) => void;
  /** Explicit all-selected state (compatibility mode) */
  allSelected?: boolean;
  /** Explicit some-selected state (compatibility mode) */
  someSelected?: boolean;
  /** If true, show select all checkbox */
  showSelectAll?: boolean;
  /** Set of row IDs that cannot be selected */
  nonSelectableIds?: Set<string>;
  /** Tooltip shown on non-selectable rows */
  nonSelectableTooltip?: string;
  /** Custom aria-label generator for row selection checkbox */
  getRowSelectionAriaLabel?: (row: TRow) => string;

  // --- Search ---
  /** Search input value (enables search when onSearchChange provided) */
  searchValue?: string;
  /** Callback when search value changes */
  onSearchChange?: (value: string) => void;

  // --- Sort ---
  /** Available sort options */
  sortOptions?: SortOption<TSortKey>[];
  /** Currently selected sort key */
  currentSort?: TSortKey;
  /** Callback when sort changes */
  onSortChange?: (sortKey: TSortKey) => void;

  // --- Columns ---
  /** Callback when columns change (visibility/order) - enables column menu when provided */
  onColumnsChange?: (columns: DataColumnConfig<TRow>[]) => void;

  // --- Row Actions ---
  /** Actions shown in each row's menu */
  rowActions?: RowAction<TRow>[];

  // --- Bulk Actions ---
  /** Actions shown when items are selected */
  bulkActions?: BulkAction[];

  // --- Pagination ---
  /** Whether more data can be loaded */
  hasMore?: boolean;
  /** Callback to load more data */
  onLoadMore?: () => void;
  /** Whether load more is in progress */
  loadMoreLoading?: boolean;

  // --- Layout ---
  /** Whether to show sticky header with controls */
  showHeader?: boolean;
  /** Top offset for sticky header */
  stickyHeaderOffset?: number;

  // --- Labels ---
  /** All localized labels */
  labels: DataTableLabels;

  // --- Customization ---
  /** Custom header content to render after built-in controls */
  headerContent?: ReactNode;
  /** Additional class name for the table */
  className?: string;
}

/**
 * Generic data table component with search, sort, column visibility,
 * selection, row actions, bulk actions, and pagination.
 */
export function DataTable<TRow, TSortKey extends string = string>({
  data,
  columns,
  getRowId,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  onSelectOne,
  allSelected: allSelectedOverride,
  someSelected: someSelectedOverride,
  showSelectAll = true,
  nonSelectableIds,
  nonSelectableTooltip,
  getRowSelectionAriaLabel,
  searchValue,
  onSearchChange,
  sortOptions,
  currentSort,
  onSortChange,
  onColumnsChange,
  rowActions,
  bulkActions,
  hasMore,
  onLoadMore,
  loadMoreLoading,
  showHeader = true,
  stickyHeaderOffset = 0,
  labels,
  headerContent,
  className,
}: DataTableProps<TRow, TSortKey>) {
  const [openedMenuRowId, setOpenedMenuRowId] = useState<string | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const showSelection =
    selectedIds !== undefined &&
    (onSelectionChange !== undefined || onSelectAll !== undefined || onSelectOne !== undefined);
  const showRowActions = rowActions && rowActions.length > 0;
  const visibleColumns = columns.filter((col) => col.visible);

  // --- Selection helpers ---
  const selectableData = data.filter((row) => !nonSelectableIds?.has(getRowId(row)));
  const computedAllSelected =
    selectableData.length > 0 && selectableData.every((row) => selectedIds?.has(getRowId(row)));
  const computedSomeSelected =
    !computedAllSelected && selectableData.some((row) => selectedIds?.has(getRowId(row)));
  const allSelected = allSelectedOverride ?? computedAllSelected;
  const someSelected = someSelectedOverride ?? computedSomeSelected;

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
      return;
    }

    if (!onSelectionChange) return;

    if (allSelected) {
      // Deselect all selectable items
      const newSelectedIds = new Set(selectedIds);
      selectableData.forEach((row) => newSelectedIds.delete(getRowId(row)));
      onSelectionChange(newSelectedIds);
    } else {
      // Select all selectable items
      const newSelectedIds = new Set(selectedIds);
      selectableData.forEach((row) => newSelectedIds.add(getRowId(row)));
      onSelectionChange(newSelectedIds);
    }
  };

  const handleSelectOne = (row: TRow, rowIndex: number, options?: { shiftKey?: boolean }) => {
    const rowId = getRowId(row);

    if (onSelectOne) {
      onSelectOne(rowId, {
        shiftKey: options?.shiftKey,
        index: rowIndex,
      });
      setLastSelectedIndex(rowIndex);
      return;
    }

    if (!onSelectionChange || !selectedIds) return;
    const newSelectedIds = new Set(selectedIds);

    if (options?.shiftKey && lastSelectedIndex !== null) {
      // Range select
      const start = Math.min(lastSelectedIndex, rowIndex);
      const end = Math.max(lastSelectedIndex, rowIndex);

      for (let i = start; i <= end; i++) {
        const rangeRow = data[i];
        const rangeRowId = getRowId(rangeRow);
        if (!nonSelectableIds?.has(rangeRowId)) {
          newSelectedIds.add(rangeRowId);
        }
      }
    } else {
      // Toggle single
      if (newSelectedIds.has(rowId)) {
        newSelectedIds.delete(rowId);
      } else {
        newSelectedIds.add(rowId);
      }
    }

    setLastSelectedIndex(rowIndex);
    onSelectionChange(newSelectedIds);
  };

  // --- Bulk actions bar ---
  const bulkActionsContent = showSelection ? (
    <Group justify="space-between" align="center" className="min-h-9">
      <Text size="sm" c="dimmed">
        {selectedIds && selectedIds.size > 0
          ? (labels.selectedCountTemplate?.replace("{count}", String(selectedIds.size)) ??
            `${selectedIds.size} selected`)
          : (labels.totalCountTemplate?.replace("{count}", String(data.length)) ??
            `${data.length} total items`)}
      </Text>

      {selectedIds && selectedIds.size > 0 && bulkActions && bulkActions.length > 0 ? (
        <ButtonGroup>
          {bulkActions.map((action) => (
            <Tooltip
              key={action.key}
              label={action.disabled ? action.disabledTooltip : undefined}
              disabled={!action.disabled || !action.disabledTooltip}
              withArrow
            >
              <Button
                color={action.color}
                variant={action.variant ?? "default"}
                leftSection={action.icon}
                className="button-scale-effect"
                onClick={() => action.onClick(selectedIds)}
                disabled={action.disabled}
                loading={action.loading}
              >
                {action.label}
              </Button>
            </Tooltip>
          ))}
        </ButtonGroup>
      ) : null}
    </Group>
  ) : null;

  // --- Header controls ---
  const hasHeaderControls =
    onSearchChange !== undefined ||
    onColumnsChange !== undefined ||
    (sortOptions && currentSort && onSortChange);

  const headerControlsContent = hasHeaderControls ? (
    <Group>
      {onSearchChange !== undefined ? (
        <SearchInput
          initialValue={searchValue ?? ""}
          placeholder={labels.searchPlaceholder}
          onChange={onSearchChange}
        />
      ) : null}
      {onColumnsChange !== undefined ? (
        <ColumnVisibilityMenu
          columns={columns}
          onColumnsChange={onColumnsChange}
          labels={labels.columnVisibility}
        />
      ) : null}
      {sortOptions && currentSort !== undefined && onSortChange ? (
        <SortMenu
          sortOptions={sortOptions}
          currentSort={currentSort}
          onSortChange={onSortChange}
          labels={labels.sort}
        />
      ) : null}
    </Group>
  ) : null;

  // --- Column span calculation ---
  const totalColSpan = visibleColumns.length + (showSelection ? 1 : 0) + (showRowActions ? 1 : 0);

  return (
    <>
      {showHeader ? (
        <Stack
          gap="md"
          py="md"
          style={{
            position: "sticky",
            top: stickyHeaderOffset,
            zIndex: 20,
            backgroundColor: "var(--mantine-color-body)",
          }}
        >
          {headerControlsContent}
          {headerContent}
          {bulkActionsContent}
        </Stack>
      ) : (
        bulkActionsContent
      )}

      <Table striped highlightOnHover className={className}>
        <TableThead>
          <TableTr>
            {showSelection && showSelectAll ? (
              <TableTh style={{ width: 40 }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </TableTh>
            ) : showSelection ? (
              <TableTh style={{ width: 40 }} />
            ) : null}

            {visibleColumns.map((col) => (
              <TableTh key={col.key} className={col.minWidthClass}>
                {col.icon ? (
                  <Group gap="xs" wrap="nowrap" style={{ width: "fit-content" }}>
                    {col.icon}
                    <Text size="sm" fw={500}>
                      {col.label}
                    </Text>
                  </Group>
                ) : (
                  <Text size="sm" fw={500}>
                    {col.label}
                  </Text>
                )}
              </TableTh>
            ))}

            {showRowActions ? (
              <TableTh style={{ width: 48 }}>
                <VisuallyHidden>{labels.actionsAriaLabel ?? "Actions"}</VisuallyHidden>
              </TableTh>
            ) : null}
          </TableTr>
        </TableThead>

        <TableTbody>
          {data.length === 0 ? (
            <TableTr>
              <TableTd colSpan={totalColSpan}>
                <Text ta="center" c="dimmed">
                  {labels.emptyStateMessage}
                </Text>
              </TableTd>
            </TableTr>
          ) : (
            data.map((row, rowIndex) => {
              const rowId = getRowId(row);
              const isSelected = selectedIds?.has(rowId);
              const isNonSelectable = nonSelectableIds?.has(rowId);
              const rowSelectionAriaLabel = getRowSelectionAriaLabel?.(row) ?? "Select row";

              return (
                <TableTr
                  key={rowId}
                  style={
                    isSelected
                      ? { backgroundColor: "var(--mantine-primary-color-light)" }
                      : undefined
                  }
                >
                  {showSelection ? (
                    <TableTd>
                      {isNonSelectable ? (
                        <Tooltip label={nonSelectableTooltip} withArrow>
                          <span>
                            <Checkbox
                              checked={isSelected}
                              indeterminate
                              disabled
                              aria-label={rowSelectionAriaLabel}
                            />
                          </span>
                        </Tooltip>
                      ) : (
                        <Checkbox
                          checked={isSelected}
                          aria-label={rowSelectionAriaLabel}
                          onChange={(event) =>
                            handleSelectOne(row, rowIndex, {
                              shiftKey: (event.nativeEvent as MouseEvent).shiftKey,
                            })
                          }
                        />
                      )}
                    </TableTd>
                  ) : null}

                  {visibleColumns.map((col) => (
                    <TableTd key={col.key} className={col.minWidthClass}>
                      {col.render(row, rowIndex)}
                    </TableTd>
                  ))}

                  {showRowActions ? (
                    <TableTd>
                      <Menu
                        shadow="md"
                        position="bottom-end"
                        opened={openedMenuRowId === rowId}
                        onChange={(opened) => setOpenedMenuRowId(opened ? rowId : null)}
                      >
                        <MenuTarget>
                          <ActionIcon
                            variant="default"
                            aria-label={labels.actionsAriaLabel ?? "Row actions"}
                            className={
                              openedMenuRowId === rowId
                                ? "button-scale-effect-active"
                                : "button-scale-effect"
                            }
                          >
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </MenuTarget>
                        <MenuDropdown>
                          {rowActions!.map((action) => (
                            <MenuItem
                              key={action.key}
                              leftSection={action.icon}
                              color={action.color}
                              onClick={() => action.onClick(row)}
                            >
                              {action.label}
                            </MenuItem>
                          ))}
                        </MenuDropdown>
                      </Menu>
                    </TableTd>
                  ) : null}
                </TableTr>
              );
            })
          )}
        </TableTbody>
      </Table>

      {hasMore && onLoadMore ? (
        <Group justify="center" pt="sm">
          <Button variant="light" onClick={onLoadMore} loading={loadMoreLoading}>
            {labels.loadMoreLabel ?? "Load more"}
          </Button>
        </Group>
      ) : null}
    </>
  );
}
