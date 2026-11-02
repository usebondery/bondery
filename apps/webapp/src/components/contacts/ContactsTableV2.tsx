"use client";

import { formatContactName } from "@bondery/helpers/contact";
import {
  type BulkAction,
  DataTable,
  type DataTableLabels,
  type RowAction,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { IconArrowMerge, IconCalendarPlus, IconTrash, IconUsersPlus } from "@tabler/icons-react";
import { useState } from "react";
import type { SortOrder } from "@/lib/contacts/table-types";
import { useContactsTableTranslations } from "@/lib/i18n/generated/hooks";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { DEFAULT_CONTACTS_SORT } from "@/lib/query/contactsListParams";
import type {
  BulkSelectionAction,
  ContactsTableV2Props,
  ContactTableRow,
  MenuAction,
} from "./contacts-table-types";
import { normalizeVisibleColumns, useContactsTableColumns } from "./hooks/useContactsTableColumns";

/**
 * Selection may store a row key or a contact id.
 * Address rows use `_rowKey`. This returns each person id once, in selection order.
 */
function participantIdsForCheckedRows(contacts: Contact[], selectedIds: Set<string>): string[] {
  const contactIdByRowId = new Map<string, string>();
  for (const contact of contacts) {
    const rowId = (contact as ContactTableRow)._rowKey ?? contact.id;
    if (!contactIdByRowId.has(rowId)) {
      contactIdByRowId.set(rowId, contact.id);
    }
    if (!contactIdByRowId.has(contact.id)) {
      contactIdByRowId.set(contact.id, contact.id);
    }
  }

  const participantIds: string[] = [];
  const seenContactIds = new Set<string>();
  for (const selectedId of selectedIds) {
    const contactId = contactIdByRowId.get(selectedId);
    if (!contactId || seenContactIds.has(contactId)) {
      continue;
    }
    seenContactIds.add(contactId);
    participantIds.push(contactId);
  }
  return participantIds;
}

/**
 * Select all with every match loaded uses loaded contacts minus excludedIds.
 * Each person is included once.
 */
function participantIdsForLoadedSelection(
  contacts: Contact[],
  excludedIds: Set<string> | undefined,
): string[] {
  const participantIds: string[] = [];
  const seenContactIds = new Set<string>();
  for (const contact of contacts) {
    if (excludedIds?.has(contact.id) || seenContactIds.has(contact.id)) {
      continue;
    }
    seenContactIds.add(contact.id);
    participantIds.push(contact.id);
  }
  return participantIds;
}

export type {
  BulkSelectionAction,
  ColumnConfig,
  ColumnKey,
  ContactTableRow,
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
  toolbarExtra,
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

  const handleSearchChange = (value: string) => {
    setSearchIsActive(value.length > 0);
    onSearchChange?.(value);
  };

  const dateFormatter = new Intl.DateTimeFormat(dateLocale || "en-US", { dateStyle: "short" });

  const selectedIdList = selectedIds ? Array.from(selectedIds) : [];

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

  const createInteractionDisabled = Boolean(isAllTotalSelected && hasMore);

  const standardBulkSelectionActions: BulkSelectionAction[] = [];
  if (standardActions?.onCreateInteractionSelected) {
    standardBulkSelectionActions.push({
      disabled: createInteractionDisabled,
      disabledTooltip: t("LogInteractionSelectLoadedTooltip"),
      icon: <IconCalendarPlus size={16} />,
      key: "createInteraction",
      label: t("LogInteractionBulk"),
      onClick: () => {
        if (createInteractionDisabled) {
          return;
        }
        const participantIds = isAllTotalSelected
          ? participantIdsForLoadedSelection(contacts, excludedIds)
          : participantIdsForCheckedRows(contacts, selectedIds ?? new Set());
        standardActions.onCreateInteractionSelected?.(participantIds);
      },
    });
  }
  if (standardActions?.onMergeSelected) {
    standardBulkSelectionActions.push({
      disabled: selectedIdList.length !== 2,
      disabledTooltip: t("MergeExactlyTwoTooltip"),
      icon: <IconArrowMerge size={16} />,
      key: "mergeSelected",
      label: standardActions.mergeBulkLabel || t("MergeBulk"),
      onClick: () => {
        if (selectedIdList.length === 2) {
          standardActions.onMergeSelected?.(selectedIdList[0], selectedIdList[1]);
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
        standardActions.onAddToGroupsSelected?.(selectedIdList);
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
          standardActions.onDeleteSelected?.(selectedIdList);
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

  const normalizedColumns = normalizeVisibleColumns(visibleColumnsProp, columnDefinitions);

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
      headerContent={null}
      isSortActive={sortOrderForMenu !== undefined && sortOrderForMenu !== DEFAULT_CONTACTS_SORT}
      labels={labels}
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
      toolbarExtra={toolbarExtra}
      totalCount={totalCount}
    />
  );
}
