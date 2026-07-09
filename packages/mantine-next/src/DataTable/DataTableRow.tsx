"use client";

import {
  Checkbox,
  Menu,
  MenuDropdown,
  MenuItem,
  MenuTarget,
  TableTd,
  TableTr,
  Tooltip,
} from "@mantine/core";
import { memo, type ReactElement } from "react";
import type { DataColumnConfig, RowAction } from "#DataTable/types.js";
import { DotsMenuButton } from "#DotsMenuButton/index.js";

export interface DataTableRowInternalProps<TRow> {
  actionsLabel: string;
  isMenuOpen: boolean;
  isNonSelectable: boolean;
  isSelected: boolean;
  nonSelectableTooltip?: string;
  onMenuClose: () => void;
  onMenuOpen: (rowId: string) => void;
  onSelectOne: (row: TRow, rowIndex: number, options?: { shiftKey?: boolean }) => void;
  row: TRow;
  rowActions?: RowAction<TRow>[];
  rowId: string;
  rowIndex: number;
  rowSelectionAriaLabel: string;
  showRowActions: boolean;
  showSelection: boolean;
  visibleColumns: DataColumnConfig<TRow>[];
}

function DataTableRowComponent<TRow>({
  row,
  rowId,
  rowIndex,
  isSelected,
  isMenuOpen,
  isNonSelectable,
  showSelection,
  showRowActions,
  visibleColumns,
  rowActions,
  nonSelectableTooltip,
  rowSelectionAriaLabel,
  onSelectOne,
  onMenuOpen,
  onMenuClose,
  actionsLabel,
}: DataTableRowInternalProps<TRow>): ReactElement | null {
  return (
    <TableTr
      style={isSelected ? { backgroundColor: "var(--mantine-primary-color-light)" } : undefined}
    >
      {showSelection ? (
        <TableTd>
          {isNonSelectable ? (
            <Tooltip label={nonSelectableTooltip} withArrow>
              <span>
                <Checkbox
                  aria-label={rowSelectionAriaLabel}
                  checked={isSelected}
                  disabled
                  indeterminate
                />
              </span>
            </Tooltip>
          ) : (
            <Checkbox
              aria-label={rowSelectionAriaLabel}
              checked={isSelected}
              onChange={(event) =>
                onSelectOne(row, rowIndex, {
                  shiftKey: (event.nativeEvent as MouseEvent).shiftKey,
                })
              }
            />
          )}
        </TableTd>
      ) : null}

      {visibleColumns.map((col) => (
        <TableTd className={col.minWidthClass} key={col.key}>
          {col.render(row, rowIndex)}
        </TableTd>
      ))}

      {showRowActions ? (
        <TableTd>
          <Menu
            onChange={(opened) => (opened ? onMenuOpen(rowId) : onMenuClose())}
            opened={isMenuOpen}
            position="bottom-end"
            shadow="md"
          >
            <MenuTarget>
              <DotsMenuButton aria-label={actionsLabel} opened={isMenuOpen} />
            </MenuTarget>
            <MenuDropdown>
              {(rowActions ?? []).map((action) => {
                const isDisabled = action.disabled?.(row) ?? false;
                const item = (
                  <MenuItem
                    color={action.color}
                    disabled={isDisabled}
                    key={action.key}
                    leftSection={action.icon}
                    onClick={() => action.onClick(row)}
                  >
                    {action.label}
                  </MenuItem>
                );
                if (isDisabled && action.disabledTooltip) {
                  return (
                    <Tooltip
                      key={action.key}
                      label={action.disabledTooltip}
                      maw={220}
                      multiline
                      withArrow
                    >
                      <div>{item}</div>
                    </Tooltip>
                  );
                }
                return item;
              })}
            </MenuDropdown>
          </Menu>
        </TableTd>
      ) : null}
    </TableTr>
  );
}

export const DataTableRow = memo(
  DataTableRowComponent,
  (prev, next) =>
    prev.rowId === next.rowId &&
    prev.rowIndex === next.rowIndex &&
    prev.isSelected === next.isSelected &&
    prev.isMenuOpen === next.isMenuOpen &&
    prev.isNonSelectable === next.isNonSelectable &&
    prev.row === next.row &&
    prev.visibleColumns === next.visibleColumns,
) as typeof DataTableRowComponent;
