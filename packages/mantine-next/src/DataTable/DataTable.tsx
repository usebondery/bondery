"use client";

import {
  Anchor,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { IconChecks } from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ColumnVisibilityMenu } from "#DataTable/ColumnVisibilityMenu.js";
import { DataTableRow } from "#DataTable/DataTableRow.js";
import { SearchInput } from "#DataTable/SearchInput.js";
import { SortMenu } from "#DataTable/SortMenu.js";
import type { DataTableProps } from "#DataTable/types.js";

export type { DataTableProps } from "#DataTable/types.js";

/**
 * Generic data table component with search, sort, column visibility,
 * selection, row actions, bulk actions, and pagination.
 */
/** Checkbox icon that renders IconChecks (used when all items across all pages are selected) */
function AllCheckedIcon({ className }: { indeterminate: boolean | undefined; className: string }) {
  return <IconChecks className={className} size={18} />;
}

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
  searchLoading,
  sortOptions,
  currentSort,
  onSortChange,
  onColumnsChange,
  rowActions,
  bulkActions,
  hasMore,
  onLoadMore,
  loadMoreLoading,
  totalCount,
  onSelectAllTotal,
  allTotalSelected,
  excludedIds,
  showHeader = true,
  stickyHeaderOffset = 0,
  labels,
  headerContent,
  className,
}: DataTableProps<TRow, TSortKey>) {
  const [openedMenuRowId, setOpenedMenuRowId] = useState<string | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Keep mutable refs so callbacks stabilised with useCallback always read the latest values.
  // This prevents memoised DataTableRow components from holding stale closures after each
  // selection change (bug: clicking row B would apply state from before row A was selected).
  const onSelectOneRef = useRef(onSelectOne);
  onSelectOneRef.current = onSelectOne;
  const onSelectAllRef = useRef(onSelectAll);
  onSelectAllRef.current = onSelectAll;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const nonSelectableIdsRef = useRef(nonSelectableIds);
  nonSelectableIdsRef.current = nonSelectableIds;
  const dataRef = useRef(data);
  dataRef.current = data;

  const handleMenuOpen = useCallback((menuRowId: string) => {
    setOpenedMenuRowId(menuRowId);
  }, []);

  const handleMenuClose = useCallback(() => {
    setOpenedMenuRowId(null);
  }, []);

  const showSelection =
    selectedIds !== undefined &&
    (onSelectionChange !== undefined || onSelectAll !== undefined || onSelectOne !== undefined);
  const showRowActions = rowActions && rowActions.length > 0;
  const visibleColumns = useMemo(() => columns.filter((col) => col.visible), [columns]);

  // --- Selection helpers ---
  const selectableData = data.filter((row) => !nonSelectableIds?.has(getRowId(row)));
  const computedAllSelected =
    selectableData.length > 0 && selectableData.every((row) => selectedIds?.has(getRowId(row)));
  const computedSomeSelected =
    !computedAllSelected && selectableData.some((row) => selectedIds?.has(getRowId(row)));
  const allSelected = allSelectedOverride ?? computedAllSelected;
  const someSelected = someSelectedOverride ?? computedSomeSelected;

  // Stable select-all handler — reads latest values through refs so it can be
  // memoised without causing unnecessary row re-renders.
  const selectableDataRef = useRef(selectableData);
  selectableDataRef.current = selectableData;
  const allSelectedRef = useRef(allSelected);
  allSelectedRef.current = allSelected;

  const handleSelectAll = useCallback(() => {
    if (onSelectAllRef.current) {
      onSelectAllRef.current();
      return;
    }
    if (!onSelectionChangeRef.current) {
      return;
    }
    const newSelectedIds = new Set(selectedIdsRef.current);
    if (allSelectedRef.current) {
      for (const row of selectableDataRef.current) {
        newSelectedIds.delete(getRowId(row));
      }
    } else {
      for (const row of selectableDataRef.current) {
        newSelectedIds.add(getRowId(row));
      }
    }
    onSelectionChangeRef.current(newSelectedIds);
  }, [getRowId]);

  // Stable per-row handler — reads latest state/callbacks through refs.
  const handleSelectOne = useCallback(
    (row: TRow, rowIndex: number, options?: { shiftKey?: boolean }) => {
      const rowId = getRowId(row);

      if (onSelectOneRef.current) {
        onSelectOneRef.current(rowId, {
          index: rowIndex,
          shiftKey: options?.shiftKey,
        });
        lastSelectedIndexRef.current = rowIndex;
        return;
      }

      if (!onSelectionChangeRef.current || !selectedIdsRef.current) {
        return;
      }
      const newSelectedIds = new Set(selectedIdsRef.current);

      if (options?.shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, rowIndex);
        const end = Math.max(lastSelectedIndexRef.current, rowIndex);
        for (let i = start; i <= end; i++) {
          const rangeRow = dataRef.current[i];
          const rangeRowId = getRowId(rangeRow);
          if (!nonSelectableIdsRef.current?.has(rangeRowId)) {
            newSelectedIds.add(rangeRowId);
          }
        }
      } else {
        if (newSelectedIds.has(rowId)) {
          newSelectedIds.delete(rowId);
        } else {
          newSelectedIds.add(rowId);
        }
      }

      lastSelectedIndexRef.current = rowIndex;
      onSelectionChangeRef.current(newSelectedIds);
    },
    [getRowId],
  );

  // --- Bulk actions bar ---
  // The effective selected count accounts for filter-mode where allTotalSelected=true
  // and excludedIds tracks deselections, so selectedIds might not hold every ID.
  const effectiveSelectedCount = allTotalSelected
    ? (totalCount ?? 0) - (excludedIds?.size ?? 0)
    : (selectedIds?.size ?? 0);

  const showSelectAllTotal =
    onSelectAllTotal &&
    totalCount !== undefined &&
    (effectiveSelectedCount > 0 || (selectedIds !== undefined && selectedIds.size > 0)) &&
    totalCount > data.length;

  const bulkActionsContent = showSelection ? (
    <Group align="center" className="min-h-9" justify="space-between">
      <Stack gap={2}>
        <Text c="dimmed" size="sm">
          {effectiveSelectedCount > 0
            ? effectiveSelectedCount === 1 && labels.selectedSingularCountTemplate
              ? labels.selectedSingularCountTemplate
              : (labels.selectedCountTemplate?.replace("{count}", String(effectiveSelectedCount)) ??
                `${effectiveSelectedCount} selected`)
            : (labels.totalCountTemplate?.replace("{count}", String(data.length)) ??
              `${data.length} total items`)}
        </Text>
        {showSelectAllTotal ? (
          allTotalSelected ? (
            <Anchor component="span" onClick={handleSelectAll} size="sm">
              {labels.clearAllTotalTemplate?.replace("{count}", String(totalCount)) ??
                `Clear selection (${totalCount})`}
            </Anchor>
          ) : (
            <Anchor component="span" onClick={onSelectAllTotal} size="sm">
              {labels.selectAllTotalTemplate?.replace("{count}", String(totalCount)) ??
                `Select all ${totalCount}`}
            </Anchor>
          )
        ) : null}
      </Stack>

      {selectedIds && effectiveSelectedCount > 0 && bulkActions && bulkActions.length > 0 ? (
        <ButtonGroup>
          {bulkActions.map((action) => (
            <Tooltip
              disabled={!action.disabled || !action.disabledTooltip}
              key={action.key}
              label={action.disabled ? action.disabledTooltip : undefined}
              withArrow
            >
              <Button
                color={action.color}
                disabled={action.disabled}
                leftSection={action.icon}
                loading={action.loading}
                onClick={() => action.onClick(selectedIds)}
                variant={action.variant ?? "default"}
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
          loading={searchLoading}
          onChange={onSearchChange}
          placeholder={labels.searchPlaceholder}
        />
      ) : null}
      {onColumnsChange !== undefined ? (
        <ColumnVisibilityMenu
          columns={columns}
          labels={labels.columnVisibility}
          onColumnsChange={onColumnsChange}
        />
      ) : null}
      {sortOptions && currentSort !== undefined && onSortChange ? (
        <SortMenu
          currentSort={currentSort}
          labels={labels.sort}
          onSortChange={onSortChange}
          sortOptions={sortOptions}
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
            backgroundColor: "var(--mantine-color-body)",
            position: "sticky",
            top: stickyHeaderOffset,
            zIndex: 20,
          }}
        >
          {headerControlsContent}
          {headerContent}
          {bulkActionsContent}
        </Stack>
      ) : (
        bulkActionsContent
      )}

      <Box style={{ overflowX: "auto" }}>
        <Table className={className} highlightOnHover striped>
          <TableThead>
            <TableTr>
              {showSelection && showSelectAll ? (
                <TableTh style={{ width: 40 }}>
                  <Checkbox
                    aria-label="Select all rows"
                    checked={allSelected || Boolean(allTotalSelected)}
                    icon={allTotalSelected ? AllCheckedIcon : undefined}
                    indeterminate={someSelected && !allTotalSelected}
                    onChange={handleSelectAll}
                  />
                </TableTh>
              ) : showSelection ? (
                <TableTh style={{ width: 40 }} />
              ) : null}

              {visibleColumns.map((col) => (
                <TableTh className={col.minWidthClass} key={col.key}>
                  {!col.hideHeader &&
                    (col.icon ? (
                      <Group gap="xxs" style={{ width: "fit-content" }} wrap="nowrap">
                        {col.icon}
                        <Text fw={500} size="sm">
                          {col.label}
                        </Text>
                      </Group>
                    ) : (
                      <Text fw={500} size="sm">
                        {col.label}
                      </Text>
                    ))}
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
                  <Text c="dimmed" ta="center">
                    {labels.emptyStateMessage}
                  </Text>
                </TableTd>
              </TableTr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = getRowId(row);
                return (
                  <DataTableRow
                    actionsLabel={labels.actionsAriaLabel ?? "Actions"}
                    isMenuOpen={openedMenuRowId === rowId}
                    isNonSelectable={nonSelectableIds?.has(rowId) ?? false}
                    isSelected={
                      allTotalSelected
                        ? !(excludedIds?.has(rowId) ?? false)
                        : (selectedIds?.has(rowId) ?? false)
                    }
                    key={rowId}
                    nonSelectableTooltip={nonSelectableTooltip}
                    onMenuClose={handleMenuClose}
                    onMenuOpen={handleMenuOpen}
                    onSelectOne={handleSelectOne}
                    row={row}
                    rowActions={rowActions}
                    rowId={rowId}
                    rowIndex={rowIndex}
                    rowSelectionAriaLabel={getRowSelectionAriaLabel?.(row) ?? "Select row"}
                    showRowActions={Boolean(showRowActions)}
                    showSelection={showSelection}
                    visibleColumns={visibleColumns}
                  />
                );
              })
            )}
          </TableTbody>
        </Table>
      </Box>

      {hasMore && onLoadMore ? (
        <Group justify="center" pt="sm">
          <Button loading={loadMoreLoading} onClick={onLoadMore} variant="light">
            {labels.loadMoreLabel ?? "Load more"}
          </Button>
        </Group>
      ) : null}
    </>
  );
}
