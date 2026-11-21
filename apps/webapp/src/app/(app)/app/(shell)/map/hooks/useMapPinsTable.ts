"use client";

import { formatContactName } from "@bondery/helpers/contact";
import type { Contact, MapPin } from "@bondery/schemas";
import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useState } from "react";
import { openMergeWithModal } from "@/app/(app)/app/(shell)/people/components/modals/MergeWithModal";
import type { ContactTableRow, SortOrder } from "@/components/contacts/ContactsTableV2";
import { openDeleteContactModal } from "@/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/components/contacts/openDeleteContactsModal";
import { usePeoplePageTranslations } from "@/lib/i18n/generated/hooks";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { pinDisplayName, sortPins } from "../utils/mapPins";
import { usePinSelection } from "./usePinSelection";

interface UseMapPinsTableOptions {
  addressContactRows: ContactTableRow[];
  locationPins: MapPin[];
  visibleLocationPins: MapPin[];
}

/** Search, sort, selection and row actions for the pins table under the map. */
export function useMapPinsTable({
  addressContactRows,
  locationPins,
  visibleLocationPins,
}: UseMapPinsTableOptions) {
  const tPeople = usePeoplePageTranslations();

  const [tableSearch, setTableSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nameAsc");

  const handleTableSearch = useDebouncedCallback(
    (query: string) => setTableSearch(query),
    DEBOUNCE_MS.tableSearch,
  );

  const filteredPins = filterAndSortPins(visibleLocationPins, tableSearch, sortOrder);
  const filteredAddressRows = filterAndSortAddressRows(addressContactRows, tableSearch, sortOrder);

  const { allSelected, clear, handleSelectAll, handleSelectOne, selectedIds, someSelected } =
    usePinSelection({ filteredPins });

  const handleDeleteContact = useCallback(
    (contactId: string) => {
      const target = locationPins.find((pin) => pin.id === contactId);
      openDeleteContactModal({
        contactId,
        contactName: target ? pinDisplayName(target) : tPeople("ThisContactFallback"),
        onDeleted: async () => {
          clear();
        },
      });
    },
    [clear, locationPins, tPeople],
  );

  const handleBulkDelete = useCallback(
    (ids: string[]) => {
      openDeleteContactsModal({
        contactIds: ids,
        onDeleted: async () => {
          clear();
        },
      });
    },
    [clear],
  );

  const openMergeModal = useCallback(
    (leftPersonId: string, rightPersonId?: string, lockBoth?: boolean) => {
      openMergeWithModal({
        contacts: visibleLocationPins as Contact[],
        disableLeftPicker: true,
        disableRightPicker: Boolean(lockBoth),
        leftPersonId,
        rightPersonId,
      });
    },
    [visibleLocationPins],
  );

  return {
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
  };
}

function searchNeedle(tableSearch: string): string {
  return tableSearch.trim().toLowerCase();
}

function filterAndSortPins(
  visibleLocationPins: MapPin[],
  tableSearch: string,
  sortOrder: SortOrder,
): MapPin[] {
  const needle = searchNeedle(tableSearch);
  const filtered = needle
    ? visibleLocationPins.filter((pin) => pinDisplayName(pin).toLowerCase().includes(needle))
    : visibleLocationPins;
  return sortPins(filtered, sortOrder);
}

function filterAndSortAddressRows(
  addressContactRows: ContactTableRow[],
  tableSearch: string,
  sortOrder: SortOrder,
): ContactTableRow[] {
  const needle = searchNeedle(tableSearch);
  const filtered = needle
    ? addressContactRows.filter((row) => formatContactName(row).toLowerCase().includes(needle))
    : addressContactRows;
  return sortPins(filtered, sortOrder);
}
