"use client";

import { formatContactName } from "@bondery/helpers/contact";
import {
  type BulkAction,
  DataTable,
  type DataTableLabels,
  type RowAction,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { IconArrowMerge, IconTrash, IconUsersPlus } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import type { SortOrder } from "@/lib/contacts/table-types";
import { useContactsTableTranslations } from "@/lib/i18n/generated/hooks";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import type {
  BulkSelectionAction,
  ContactsTableV2Props,
  ContactTableRow,
  MenuAction,
} from "./contacts-table-types";
import { normalizeVisibleColumns, useContactsTableColumns } from "./hooks/useContactsTableColumns";

export type {
  BulkSelectionAction,
  ColumnConfig,
  ColumnKey,
  ContactTableRow,
  LoadMoreAction,
  MenuAction,
  SortOrder,
  StandardContactActions,
} from "./contacts-table-types";

export default function ContactsTableV2({
  contacts,
  selectedIds,
  isHeaderShown = true,
  headerStickyTop = 0,
  searchPlaceholder,
  searchDefaultValue,
  searchValue,
  onSearchChange,
  searchLoading,
  columnsForMenu,
  setColumnsForMenu,
  sortOrderForMenu,
  setSortOrderForMenu,
  visibleColumns: visibleColumnsProp,
  onSelectAll,
  onSelectOne,
  allSelected,
  someSelected,
  showSelection,
  nonSelectableIds,
  nonSelectableTooltip,
  standardActions,
  menuActions,
  bulkSelectionActions,
  loadMoreAction,
  hasMore,
  totalCount,
  onSelectAllTotal,
  isAllTotalSelected,
  excludedIds,
  disableNameLink,
  dateLocale,
  noContactsFound,
  noContactsMatchSearch,
  renderLocationCell,
}: ContactsTableV2Props) {
  const { columnDefinitions, sortOptions, buildTableLabels } = useContactsTableCopy();
  const t = useContactsTableTranslations();
  const [searchIsActive, setSearchIsActive] = useState(() =>
    Boolean(searchValue ?? searchDefaultValue),
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchIsActive(value.length > 0);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(dateLocale || "en-US", { dateStyle: "short" }),
    [dateLocale],
  );

  const selectedContacts = contacts.filter((contact) => selectedIds?.has(contact.id));

  const standardMenuActions: MenuAction[] = [];
  if (standardActions?.onMergeOne) {
    standardMenuActions.push({
      icon: <IconArrowMerge size={14} />,
      key: "mergeWith",
      label: standardActions.mergeMenuLabel || t("MergeMenu"),
      onClick: (contactId) => standardActions.onMergeOne?.(contactId),
    });
  }
  if (standardActions?.onAddToGroupsOne) {
    standardMenuActions.push({
      icon: <IconUsersPlus size={14} />,
      key: "addToGroups",
      label: standardActions.addToGroupsMenuLabel || t("EditGroupsMenu"),
      onClick: (contactId) => standardActions.onAddToGroupsOne?.(contactId),
    });
  }
  const standardDeleteMenuAction: MenuAction | null = standardActions?.onDeleteOne
    ? {
        color: "red",
        icon: <IconTrash size={14} />,
        key: "deleteContact",
        label: standardActions.deleteMenuLabel || t("Delete"),
        onClick: (contactId) => standardActions.onDeleteOne?.(contactId),
      }
    : null;

  const standardBulkSelectionActions: BulkSelectionAction[] = [];
  if (standardActions?.onMergeSelected) {
    standardBulkSelectionActions.push({
      disabled: selectedContacts.length !== 2,
      disabledTooltip: t("MergeExactlyTwoTooltip"),
      icon: <IconArrowMerge size={16} />,
      key: "mergeSelected",
      label: standardActions.mergeBulkLabel || t("MergeBulk"),
      onClick: () => {
        if (selectedContacts.length === 2) {
          standardActions.onMergeSelected?.(selectedContacts[0].id, selectedContacts[1].id);
        }
      },
    });
  }
  if (standardActions?.onAddToGroupsSelected) {
    standardBulkSelectionActions.push({
      icon: <IconUsersPlus size={16} />,
      key: "addSelectedToGroups",
      label: standardActions.addToGroupsBulkLabel || t("EditGroupsBulk"),
      onClick: () => {
        const ids = selectedContacts.map((contact) => contact.id);
        standardActions.onAddToGroupsSelected?.(ids);
      },
    });
  }
  const standardDeleteBulkAction: BulkSelectionAction | null = standardActions?.onDeleteSelected
    ? {
        color: "red",
        icon: <IconTrash size={16} />,
        key: "deleteSelected",
        label: standardActions.deleteBulkLabel || t("Delete"),
        loading: standardActions.isDeleteSelectedLoading,
        onClick: () => {
          const ids = selectedContacts.map((contact) => contact.id);
          standardActions.onDeleteSelected?.(ids);
        },
      }
    : null;

  const effectiveMenuActions: MenuAction[] = [
    ...(menuActions || []),
    ...standardMenuActions,
    ...(standardDeleteMenuAction ? [standardDeleteMenuAction] : []),
  ];
  const effectiveBulkSelectionActions: BulkSelectionAction[] = [
    ...standardBulkSelectionActions,
    ...(bulkSelectionActions || []),
    ...(standardDeleteBulkAction ? [standardDeleteBulkAction] : []),
  ];

  const normalizedColumns = useMemo(
    () => normalizeVisibleColumns(visibleColumnsProp, columnDefinitions),
    [columnDefinitions, visibleColumnsProp],
  );

  const sourceColumns = columnsForMenu ?? normalizedColumns;

  const tableColumns = useContactsTableColumns({
    dateFormatter,
    disableNameLink,
    renderLocationCell,
    sourceColumns,
  });

  const rowActions: RowAction<Contact>[] = effectiveMenuActions.map((action) => ({
    color: action.color,
    disabled: action.disabled,
    disabledTooltip: action.disabledTooltip,
    icon: action.icon,
    key: action.key,
    label: action.label,
    onClick: (contact) => action.onClick(contact.id),
  }));

  const bulkActions: BulkAction[] = effectiveBulkSelectionActions.map((action) => ({
    color: action.color,
    disabled: action.disabled,
    disabledTooltip: action.disabledTooltip,
    icon: action.icon,
    key: action.key,
    label: action.label,
    loading: action.loading,
    onClick: action.onClick,
    variant: action.variant,
  }));

  const labels: DataTableLabels = buildTableLabels({
    emptyStateMessage: searchIsActive ? noContactsMatchSearch : noContactsFound,
    loadMoreLabel: loadMoreAction?.label,
    searchPlaceholder,
  });

  const allTotalSelected = isAllTotalSelected ?? false;

  return (
    <DataTable<Contact, SortOrder>
      allSelected={allSelected}
      allTotalSelected={allTotalSelected}
      bulkActions={bulkActions.length > 0 ? bulkActions : undefined}
      columns={tableColumns}
      currentSort={sortOrderForMenu}
      data={contacts}
      excludedIds={excludedIds}
      getRowId={(contact: ContactTableRow) => contact._rowKey ?? contact.id}
      getRowSelectionAriaLabel={(contact) => `Select ${formatContactName(contact)}`}
      hasMore={Boolean(loadMoreAction && hasMore)}
      headerContent={null}
      labels={labels}
      loadMoreLoading={loadMoreAction?.loading}
      nonSelectableIds={nonSelectableIds}
      nonSelectableTooltip={nonSelectableTooltip}
      onColumnsChange={
        setColumnsForMenu
          ? (nextColumns) => {
              setColumnsForMenu(
                nextColumns.map((column) => ({
                  fixed: column.fixed,
                  icon: column.icon,
                  key: column.key as import("@/lib/contacts/table-types").ColumnKey,
                  label: column.label,
                  visible: column.visible,
                })),
              );
            }
          : undefined
      }
      onLoadMore={loadMoreAction?.onClick}
      onSearchChange={handleSearchChange}
      onSelectAll={showSelection ? onSelectAll : undefined}
      onSelectAllTotal={onSelectAllTotal}
      onSelectOne={showSelection ? onSelectOne : undefined}
      onSortChange={setSortOrderForMenu}
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      searchLoading={searchLoading}
      searchValue={searchValue ?? searchDefaultValue}
      selectedIds={selectedIds}
      showHeader={isHeaderShown}
      showSelectAll={showSelection}
      someSelected={someSelected}
      sortOptions={sortOrderForMenu && setSortOrderForMenu ? sortOptions : undefined}
      stickyHeaderOffset={headerStickyTop}
      totalCount={totalCount}
    />
  );
}
