"use client";

import type { Contact } from "@bondery/schemas";
import { Badge, Group, Paper, Text, Tooltip } from "@mantine/core";
import type { Dispatch, SetStateAction } from "react";
import ContactsTable, {
  type ColumnConfig,
  type ContactTableRow,
} from "@/components/contacts/ContactsTableV2";
import { useMapPageTranslations } from "@/lib/i18n/generated/hooks";
import type { useMapPinsTable } from "../hooks/useMapPinsTable";
import { ADDRESS_TYPE_COLOR } from "../utils/mapConstants";
import { buildPinRowActions } from "../utils/pinRowActions";
import type { MapView } from "../utils/types";

interface MapPinsTableProps {
  columns: ColumnConfig[];
  isFetching: boolean;
  setColumns: Dispatch<SetStateAction<ColumnConfig[]>>;
  table: ReturnType<typeof useMapPinsTable>;
  view: MapView;
  visibleColumns: ColumnConfig[];
}

/** Table of the pins currently visible on the map, for the locations or addresses view. */
export function MapPinsTable({
  columns,
  isFetching,
  setColumns,
  table,
  view,
  visibleColumns,
}: MapPinsTableProps) {
  const t = useMapPageTranslations();
  const {
    allSelected,
    filteredAddressRows,
    filteredPins,
    handleBulkDelete,
    handleDeleteContact,
    handleSelectAll,
    handleSelectOne,
    handleTableSearch,
    openMergeModal,
    selectedIds,
    setSortOrder,
    someSelected,
    sortOrder,
  } = table;

  const isAddressView = view === "addresses";
  const contacts = isAddressView ? filteredAddressRows : (filteredPins as Contact[]);

  return (
    <Paper p="md" radius="md" shadow="sm" withBorder>
      <ContactsTable
        allSelected={allSelected}
        columnsForMenu={columns}
        contacts={contacts}
        isHeaderShown={true}
        noContactsFound={t(isAddressView ? "NoAddressesFound" : "NoContactsFound")}
        noContactsMatchSearch={t(
          isAddressView ? "NoAddressesMatchSearch" : "NoContactsMatchSearch",
        )}
        onSearchChange={handleTableSearch}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        renderLocationCell={isAddressView ? renderAddressLocationCell : undefined}
        searchLoading={isFetching}
        selectedIds={selectedIds}
        setColumnsForMenu={setColumns}
        setSortOrderForMenu={setSortOrder}
        showSelection
        someSelected={someSelected}
        sortOrderForMenu={sortOrder}
        standardActions={buildPinRowActions({
          contacts,
          onDeleteOne: handleDeleteContact,
          onDeleteSelected: handleBulkDelete,
          onMergeOne: (contactId) => openMergeModal(contactId),
          onMergeSelected: (leftContactId, rightContactId) =>
            openMergeModal(leftContactId, rightContactId, true),
        })}
        visibleColumns={visibleColumns}
      />
    </Paper>
  );
}

/** Address category badge in front of the formatted address. */
function renderAddressLocationCell(contact: ContactTableRow) {
  const type = contact._addressType;
  const address = contact.location ? contact.location : "—";
  return (
    <Group gap={6} style={{ minWidth: 0 }} wrap="nowrap">
      <Badge
        color={ADDRESS_TYPE_COLOR[type ?? "other"] ?? "gray"}
        size="xs"
        style={{ flexShrink: 0 }}
        variant="light"
      >
        {type}
      </Badge>
      <Tooltip label={address}>
        <Text lineClamp={1} size="sm">
          {address}
        </Text>
      </Tooltip>
    </Group>
  );
}
