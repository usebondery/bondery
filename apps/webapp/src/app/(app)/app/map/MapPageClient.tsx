"use client";

import { Badge, Group, Paper, SegmentedControl, Stack, Text, Tooltip } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconBrandLinkedin,
  IconBriefcase,
  IconClock,
  IconHome,
  IconMap2,
  IconMapPin,
  IconUser,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { DEBOUNCE_MS } from "@/lib/config";
import type { MergeConflictField } from "@bondery/types";
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
import {
  PeopleMap,
  type MapBounds,
  type PeopleMapFocus,
} from "@/app/(app)/app/components/map/PeopleMap";
import type { MapView, MapPin, AddressPin } from "./types";
import type { MapSuggestionItem } from "./actions";
import { revalidateContacts } from "../actions";

interface MapPageClientProps {
  view: MapView;
}

function sortPins(list: MapPin[], order: SortOrder): MapPin[] {
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

export function MapPageClient({ view }: MapPageClientProps) {
  const t = useTranslations("MapPage");
  const tMerge = useTranslations("MergeWithModal");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
      conflictHint: tMerge("ConflictHint"),
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

  // Map location search
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

  // Pins — separate state per view so switching doesn't flash stale data
  const [locationPins, setLocationPins] = useState<MapPin[]>([]);
  const [addressPins, setAddressPins] = useState<AddressPin[]>([]);
  const [visibleMarkerIds, setVisibleMarkerIds] = useState<string[]>([]);

  // viewRef wraps the view prop so fetchPins can read the current view
  // without being listed in its useCallback deps (keeping it stable).
  const viewRef = useRef<MapView>(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // lastBoundsRef stores the last known viewport bounds so a view switch
  // can re-fetch without waiting for a map movement event.
  const lastBoundsRef = useRef<MapBounds | null>(null);

  const fetchPins = useCallback(async (bounds: MapBounds) => {
    // Clamp to valid API ranges. Leaflet reports values outside ±180/±90 when
    // the viewport covers more than one world-width (common at low zoom levels).
    const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
    const clampLon = (v: number) => Math.max(-180, Math.min(180, v));
    const lonSpan = bounds.maxLon - bounds.minLon;
    const minLon = lonSpan >= 360 ? -180 : clampLon(bounds.minLon);
    const maxLon = lonSpan >= 360 ? 180 : clampLon(bounds.maxLon);
    const params = new URLSearchParams({
      minLat: String(clampLat(bounds.minLat)),
      maxLat: String(clampLat(bounds.maxLat)),
      minLon: String(minLon),
      maxLon: String(maxLon),
    });

    const mode = viewRef.current;
    const endpoint =
      mode === "addresses" ? API_ROUTES.CONTACTS_MAP_ADDRESS_PINS : API_ROUTES.CONTACTS_MAP_PINS;

    try {
      const res = await fetch(`${endpoint}?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      if (mode === "addresses") {
        setAddressPins(json.pins || []);
      } else {
        setLocationPins(json.pins || []);
      }
    } catch {
      // silently ignore transient network errors
    }
  }, []); // stable — view is read from viewRef

  const handleBoundsChange = useDebouncedCallback((bounds: MapBounds) => {
    lastBoundsRef.current = bounds;
    void fetchPins(bounds);
  }, DEBOUNCE_MS.mapViewport);

  // When view changes: clear stale pins and re-fetch immediately using last known bounds.
  useEffect(() => {
    setLocationPins([]);
    setAddressPins([]);
    setVisibleMarkerIds([]);
    if (lastBoundsRef.current) void fetchPins(lastBoundsRef.current);
  }, [view, fetchPins]);

  // SegmentedControl handler — updates the URL to switch view
  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Derive map markers from the active pin set
  const markers = useMemo(() => {
    if (view === "addresses") {
      return addressPins.map((p) => ({
        id: p.addressId,
        name: [p.firstName, p.lastName].filter(Boolean).join(" "),
        firstName: p.firstName,
        lastName: p.lastName,
        latitude: p.latitude,
        longitude: p.longitude,
        avatarUrl: p.avatar,
        href: `${WEBAPP_ROUTES.PERSON}/${p.personId}`,
      }));
    }
    return locationPins.map((p) => ({
      id: p.id,
      name: [p.firstName, p.lastName].filter(Boolean).join(" "),
      firstName: p.firstName,
      lastName: p.lastName,
      latitude: p.latitude,
      longitude: p.longitude,
      avatarUrl: p.avatar,
      href: `${WEBAPP_ROUTES.PERSON}/${p.id}`,
    }));
  }, [view, locationPins, addressPins]);

  // Contacts visible in the current viewport (for the table below the map)
  const visibleLocationPins = useMemo(() => {
    const idSet = new Set(visibleMarkerIds);
    return locationPins.filter((p) => idSet.has(p.id));
  }, [locationPins, visibleMarkerIds]);

  const visibleAddressPins = useMemo(() => {
    const idSet = new Set(visibleMarkerIds);
    return addressPins.filter((p) => idSet.has(p.addressId));
  }, [addressPins, visibleMarkerIds]);

  // Map address pins to a contact-shaped object so we can reuse ContactsTable.
  // id = personId so the PersonChip name link points to the correct person.
  // _addressType is a custom extra field read by renderAddressLocationCell via `as any`.
  const ADDRESS_TYPE_COLOR: Record<string, string> = { home: "blue", work: "grape", other: "gray" };

  const addressContactRows = useMemo(
    () =>
      visibleAddressPins.map((pin) => ({
        id: pin.personId,
        _rowKey: pin.addressId,
        firstName: pin.firstName,
        middleName: null,
        lastName: pin.lastName,
        headline: null,
        location:
          pin.addressFormatted ??
          [pin.addressCity, pin.addressCountry].filter(Boolean).join(", ") ??
          null,
        avatar: pin.avatar,
        lastInteraction: null,
        _addressType: pin.addressType,
      })),
    [visibleAddressPins],
  );

  const [tableSearch, setTableSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nameAsc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "name", label: "Name", visible: true, icon: <IconUser size={16} />, fixed: true },
    { key: "headline", label: "Headline", visible: true, icon: <IconBriefcase size={16} /> },
    { key: "location", label: "Location", visible: true, icon: <IconMapPin size={16} /> },
    {
      key: "lastInteraction",
      label: "Last Interaction",
      visible: true,
      icon: <IconClock size={16} />,
    },
    {
      key: "social",
      label: "Socials",
      visible: false,
      icon: <IconBrandLinkedin size={16} />,
    },
  ]);

  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

  // Reset selection when viewport changes
  useEffect(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, [visibleMarkerIds]);

  const handleTableSearch = useDebouncedCallback(
    (q: string) => setTableSearch(q),
    DEBOUNCE_MS.tableSearch,
  );

  const filteredPins = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    const base = query
      ? visibleLocationPins.filter((p) =>
          [p.firstName, p.lastName].filter(Boolean).join(" ").toLowerCase().includes(query),
        )
      : visibleLocationPins;
    return sortPins(base, sortOrder);
  }, [visibleLocationPins, tableSearch, sortOrder]);

  const filteredAddressRows = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    const base = query
      ? addressContactRows.filter((r) =>
          formatContactName(r as any)
            .toLowerCase()
            .includes(query),
        )
      : addressContactRows;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return sortPins(base as any, sortOrder) as unknown as typeof addressContactRows;
  }, [addressContactRows, tableSearch, sortOrder]);

  const allSelected = filteredPins.length > 0 && selectedIds.size === filteredPins.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredPins.length;

  const handleSelectAll = () => {
    if (selectedIds.size === filteredPins.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPins.map((p) => p.id)));
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex = options?.index ?? filteredPins.findIndex((p) => p.id === id);

    if (options?.shiftKey && lastSelectedIndex !== null && currentIndex >= 0) {
      const shouldSelect = !selectedIds.has(id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = filteredPins.slice(start, end + 1).map((p) => p.id);
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
    const target = locationPins.find((p) => p.id === contactId);
    openDeleteContactModal({
      contactId,
      contactName: target
        ? [target.firstName, target.lastName].filter(Boolean).join(" ")
        : "this contact",
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contacts: visibleLocationPins as any,
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
        <PageHeader
          icon={IconMap2}
          title={t("Title")}
          description={t("Subtitle")}
          secondaryAction={
            <SegmentedControl
              value={view}
              onChange={handleViewChange}
              size="xs"
              data={[
                {
                  value: "locations",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconMapPin size={14} />
                      <span>{t("ViewLocations")}</span>
                    </Group>
                  ),
                },
                {
                  value: "addresses",
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconHome size={14} />
                      <span>{t("ViewAddresses")}</span>
                    </Group>
                  ),
                },
              ]}
            />
          }
        />

        {/* Map location autocomplete */}
        <LocationLookupInput
          label={t("SearchLabel")}
          placeholder={t("SearchPlaceholder")}
          value={locationQuery}
          onChange={setLocationQuery}
          onSuggestionSelect={handleLocationSelect}
        />

        {/* Map — always rendered; pins are fetched on viewport change */}
        <PeopleMap
          markers={markers}
          center={[35, -25]}
          zoom={3}
          height={560}
          focus={mapFocus}
          onVisibleMarkerIdsChange={setVisibleMarkerIds}
          onBoundsChange={handleBoundsChange}
          disableAutoFit
        />

        {/* Table below map — branches on the active view */}
        {view === "addresses" ? (
          <Paper withBorder shadow="sm" radius="md" p="md">
            <ContactsTable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              contacts={filteredAddressRows as any}
              selectedIds={selectedIds}
              isHeaderShown={true}
              onSearchChange={handleTableSearch}
              noContactsFound={t("NoAddressesFound")}
              noContactsMatchSearch={t("NoAddressesMatchSearch")}
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
              renderLocationCell={(contact) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const type = (contact as any)._addressType as string;
                const addr = contact.location || "—";
                return (
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                    <Badge
                      size="xs"
                      variant="light"
                      color={ADDRESS_TYPE_COLOR[type] ?? "gray"}
                      style={{ flexShrink: 0 }}
                    >
                      {type}
                    </Badge>
                    <Tooltip label={addr} withArrow>
                      <Text size="sm" lineClamp={1}>
                        {addr}
                      </Text>
                    </Tooltip>
                  </Group>
                );
              }}
            />
          </Paper>
        ) : (
          <Paper withBorder shadow="sm" radius="md" p="md">
            <ContactsTable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              contacts={filteredPins as any}
              selectedIds={selectedIds}
              isHeaderShown={true}
              onSearchChange={handleTableSearch}
              noContactsFound={t("NoContactsFound")}
              noContactsMatchSearch={t("NoContactsMatchSearch")}
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
        )}
      </Stack>
    </PageWrapper>
  );
}
