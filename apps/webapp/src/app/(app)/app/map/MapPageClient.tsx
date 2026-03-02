"use client";

import { Paper, Stack, Text } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconBrandLinkedin,
  IconBriefcase,
  IconClock,
  IconMap2,
  IconMapPin,
  IconUser,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, MergeConflictField } from "@bondery/types";
import ContactsTable, {
  type ColumnConfig,
  type SortOrder,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";
import { LocationLookupInput } from "@/app/(app)/app/components/LocationLookupInput";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { openAddPeopleToGroupSelectionModal } from "@/app/(app)/app/people/components/AddPeopleToGroupSelectionModal";
import {
  MERGE_CONFLICT_FIELDS,
  openMergeWithModal,
} from "@/app/(app)/app/people/components/MergeWithModal";
import { formatContactName } from "@/lib/nameHelpers";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { PeopleMap, type PeopleMapFocus } from "@/app/(app)/app/components/map/PeopleMap";
import type { MapSuggestionItem } from "./actions";
import { revalidateContacts } from "../actions";

interface MapPageClientProps {
  contacts: Contact[];
}

function sortContacts(list: Contact[], order: SortOrder): Contact[] {
  return [...list].sort((a, b) => {
    switch (order) {
      case "nameAsc":
        return (a.firstName || "").localeCompare(b.firstName || "");
      case "nameDesc":
        return (b.firstName || "").localeCompare(a.firstName || "");
      case "surnameAsc":
        return (a.lastName || "").localeCompare(b.lastName || "");
      case "surnameDesc":
        return (b.lastName || "").localeCompare(a.lastName || "");
      case "interactionDesc":
        return (b.lastInteraction || "").localeCompare(a.lastInteraction || "");
      case "interactionAsc":
        return (a.lastInteraction || "").localeCompare(b.lastInteraction || "");
      default:
        return 0;
    }
  });
}

export function MapPageClient({ contacts }: MapPageClientProps) {
  const t = useTranslations("MapPage");
  const tMerge = useTranslations("MergeWithModal");
  const router = useRouter();
  const mergeTexts = useMemo(
    () => ({
      errorTitle: tMerge("ErrorTitle"),
      successTitle: tMerge("SuccessTitle"),
      selectBothPeopleError: tMerge("SelectBothPeopleError"),
      differentPeopleError: tMerge("DifferentPeopleError"),
      mergingTitle: tMerge("MergingTitle"),
      mergingDescription: tMerge("MergingDescription"),
      mergeSuccess: tMerge("MergeSuccess"),
      mergeFailed: tMerge("MergeFailed"),
      mergeWithLabel: tMerge("MergeWithLabel"),
      selectLeftPerson: tMerge("SelectLeftPerson"),
      selectRightPerson: tMerge("SelectRightPerson"),
      searchPeople: tMerge("SearchPeople"),
      noPeopleFound: tMerge("NoPeopleFound"),
      cancel: tMerge("Cancel"),
      continue: tMerge("Continue"),
      back: tMerge("Back"),
      merge: tMerge("Merge"),
      noConflicts: tMerge("NoConflicts"),
      processing: tMerge("Processing"),
      steps: {
        pick: tMerge("Steps.Pick"),
        resolve: tMerge("Steps.Resolve"),
        process: tMerge("Steps.Process"),
      },
      fields: Object.fromEntries(
        MERGE_CONFLICT_FIELDS.map((field) => [field, tMerge(`Fields.${field}`)]),
      ) as Record<MergeConflictField, string>,
    }),
    [tMerge],
  );

  //  Map location search
  const [locationQuery, setLocationQuery] = useState("");
  const [mapFocus, setMapFocus] = useState<PeopleMapFocus | null>(null);

  const handleLocationSelect = (selected: MapSuggestionItem) => {
    if (!selected || selected.position.lat === null || selected.position.lon === null) return;
    setLocationQuery(selected.label);
    setMapFocus({
      latitude: selected.position.lat,
      longitude: selected.position.lon,
      zoom: 13,
      token: `${selected.label}-${Date.now()}`,
    });
  };

  //  Map markers
  const [visibleMarkerIds, setVisibleMarkerIds] = useState<string[]>([]);

  const markers = useMemo(
    () =>
      contacts
        .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
        .map((c) => ({
          id: c.id,
          name: formatContactName(c),
          firstName: c.firstName,
          lastName: c.lastName,
          latitude: c.latitude as number,
          longitude: c.longitude as number,
          avatarUrl: c.avatar,
          href: `${WEBAPP_ROUTES.PERSON}/${c.id}`,
        })),
    [contacts],
  );

  const initialCenter = useMemo<[number, number]>(() => {
    if (markers.length === 0) {
      // Atlantic centre – shows USA and Europe simultaneously at zoom 3
      return [35, -25];
    }

    const [sumLat, sumLon] = markers.reduce(
      ([latAcc, lonAcc], marker) => [latAcc + marker.latitude, lonAcc + marker.longitude],
      [0, 0],
    );

    return [sumLat / markers.length, sumLon / markers.length];
  }, [markers]);

  //  Visible-contacts table
  const visibleContacts = useMemo(() => {
    const idSet = new Set(visibleMarkerIds);
    return contacts.filter((c) => idSet.has(c.id));
  }, [contacts, visibleMarkerIds]);

  const [tableSearch, setTableSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nameAsc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "name", label: "Name", visible: true, icon: <IconUser size={16} />, fixed: true },
    { key: "headline", label: "Headline", visible: true, icon: <IconBriefcase size={16} /> },
    { key: "place", label: "Location", visible: true, icon: <IconMapPin size={16} /> },
    {
      key: "lastInteraction",
      label: "Last Interaction",
      visible: true,
      icon: <IconClock size={16} />,
    },
    { key: "social", label: "Social Media", visible: true, icon: <IconBrandLinkedin size={16} /> },
  ]);

  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

  // Reset selection when viewport changes
  useEffect(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, [visibleMarkerIds]);

  const handleTableSearch = useDebouncedCallback((q: string) => setTableSearch(q), 200);

  const filteredContacts = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    const base = query
      ? visibleContacts.filter((c) => formatContactName(c).toLowerCase().includes(query))
      : visibleContacts;
    return sortContacts(base, sortOrder);
  }, [visibleContacts, tableSearch, sortOrder]);

  const allSelected = filteredContacts.length > 0 && selectedIds.size === filteredContacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredContacts.length;

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex = options?.index ?? filteredContacts.findIndex((c) => c.id === id);

    if (options?.shiftKey && lastSelectedIndex !== null && currentIndex >= 0) {
      const shouldSelect = !selectedIds.has(id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = filteredContacts.slice(start, end + 1).map((c) => c.id);
      const next = new Set(selectedIds);
      rangeIds.forEach((rid) => (shouldSelect ? next.add(rid) : next.delete(rid)));
      setSelectedIds(next);
      setLastSelectedIndex(currentIndex);
      return;
    }

    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    if (currentIndex >= 0) setLastSelectedIndex(currentIndex);
  };

  const handleDeleteContact = (contactId: string) => {
    const target = contacts.find((c) => c.id === contactId);
    openDeleteContactModal({
      contactId,
      contactName: target ? formatContactName(target) : "this contact",
      onDeleted: async () => {
        setSelectedIds(new Set());
        await revalidateContacts();
        router.refresh();
      },
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    openDeleteContactsModal({
      contactIds: ids,
      onDeleted: async () => {
        setSelectedIds(new Set());
        await revalidateContacts();
        router.refresh();
      },
    });
  };

  const openMergeModal = (leftPersonId: string, rightPersonId?: string, lockBoth?: boolean) => {
    openMergeWithModal({
      contacts,
      leftPersonId,
      rightPersonId,
      disableLeftPicker: true,
      disableRightPicker: Boolean(lockBoth),
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
    });
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader icon={IconMap2} title={t("Title")} description={t("Subtitle")} />

        {/* Map location autocomplete */}
        <LocationLookupInput
          label={t("SearchLabel")}
          placeholder={t("SearchPlaceholder")}
          value={locationQuery}
          onChange={setLocationQuery}
          onSuggestionSelect={handleLocationSelect}
        />

        {/* Map */}
        {markers.length > 0 ? (
          <PeopleMap
            markers={markers}
            center={initialCenter}
            zoom={3}
            height={560}
            focus={mapFocus}
            onVisibleMarkerIdsChange={setVisibleMarkerIds}
          />
        ) : (
          <Text c="dimmed">{t("Empty")}</Text>
        )}

        {/* Contacts-in-viewport table  same pattern as People page */}
        <Paper withBorder shadow="sm" radius="md" p="md">
          <ContactsTable
            contacts={filteredContacts}
            selectedIds={selectedIds}
            isHeaderShown={true}
            onSearchChange={handleTableSearch}
            columnsForMenu={columns}
            setColumnsForMenu={setColumns}
            sortOrderForMenu={sortOrder}
            setSortOrderForMenu={setSortOrder}
            visibleColumns={visibleColumns}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            allSelected={allSelected}
            someSelected={someSelected}
            showSelection
            standardActions={{
              onMergeOne: (contactId) => openMergeModal(contactId),
              onMergeSelected: (leftContactId, rightContactId) =>
                openMergeModal(leftContactId, rightContactId, true),
              onAddToGroupsOne: (contactId) =>
                openAddPeopleToGroupSelectionModal({ personIds: [contactId] }),
              onAddToGroupsSelected: (contactIds) =>
                openAddPeopleToGroupSelectionModal({ personIds: contactIds }),
              onDeleteOne: handleDeleteContact,
              onDeleteSelected: handleBulkDelete,
            }}
          />
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
