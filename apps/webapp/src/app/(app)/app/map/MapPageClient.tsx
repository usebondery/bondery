"use client";

import type { ContactNameFields } from "@bondery/helpers/contact";
import { formatContactName } from "@bondery/helpers/contact";
import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, ContactAddressEntry } from "@bondery/schemas";
import {
  Badge,
  Box,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ColumnKey } from "@/app/(app)/app/components/contacts/ContactsTableV2";
import ContactsTable, {
  type ColumnConfig,
  type ContactTableRow,
  type SortOrder,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { LocationLookupInput } from "@/app/(app)/app/components/LocationLookupInput";
import {
  type MapBounds,
  PeopleMap,
  type PeopleMapFocus,
} from "@/app/(app)/app/components/map/PeopleMap";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { openAddPeopleToGroupSelectionModal } from "@/app/(app)/app/people/components/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "@/app/(app)/app/people/components/MergeWithModal";
import type { MapPinsBounds } from "@/lib/api/resources/contacts";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useMapViewportPins } from "@/lib/query/hooks/useMapViewportPins";
import type { MapView } from "./utils/types";

const MAP_TABLE_COLUMN_KEYS: ColumnKey[] = [
  "name",
  "headline",
  "location",
  "lastInteraction",
  "social",
];

interface MapPageClientProps {
  view: MapView;
}

function clampBounds(bounds: MapBounds): MapPinsBounds {
  const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
  const clampLon = (v: number) => Math.max(-180, Math.min(180, v));
  const lonSpan = bounds.maxLon - bounds.minLon;
  const minLon = lonSpan >= 360 ? -180 : clampLon(bounds.minLon);
  const maxLon = lonSpan >= 360 ? 180 : clampLon(bounds.maxLon);
  return {
    maxLat: clampLat(bounds.maxLat),
    maxLon,
    minLat: clampLat(bounds.minLat),
    minLon,
  };
}

function sortPins<T extends ContactNameFields & { lastInteraction?: string | null }>(
  list: T[],
  order: SortOrder,
): T[] {
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
  const t = useWebTranslations("MapPage");
  const tPeople = useWebTranslations("PeoplePage");
  const { columnDefinitions } = useContactsTableCopy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [locationQuery, setLocationQuery] = useState("");
  const [mapFocus, setMapFocus] = useState<PeopleMapFocus | null>(null);
  const [viewportBounds, setViewportBounds] = useState<MapPinsBounds | null>(null);
  const [visibleMarkerIds, setVisibleMarkerIds] = useState<string[]>([]);

  const { locationPins, addressPins, isFetching, isLoading } = useMapViewportPins(
    view,
    viewportBounds,
  );
  const showPinsFetching = isFetching && !isLoading;

  const handleLocationSelect = (selected: ContactAddressEntry) => {
    if (selected.latitude === null || selected.longitude === null) {
      return;
    }
    const label = geocodeSuggestionDisplayLabel(selected);
    setLocationQuery(label);
    setMapFocus({
      latitude: selected.latitude,
      longitude: selected.longitude,
      token: `${label}-${Date.now()}`,
      zoom: 13,
    });
  };

  const handleBoundsChange = useDebouncedCallback((bounds: MapBounds) => {
    setViewportBounds(clampBounds(bounds));
  }, DEBOUNCE_MS.mapViewport);

  useEffect(() => {
    setVisibleMarkerIds([]);
  }, []);

  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const markers = useMemo(() => {
    if (view === "addresses") {
      return addressPins.map((p) => ({
        avatarUrl: p.avatar,
        firstName: p.firstName,
        href: `${WEBAPP_ROUTES.PERSON}/${p.personId}`,
        id: p.addressId,
        lastName: p.lastName,
        latitude: p.latitude,
        longitude: p.longitude,
        name: [p.firstName, p.lastName].filter(Boolean).join(" "),
      }));
    }
    return locationPins.map((p) => ({
      avatarUrl: p.avatar,
      firstName: p.firstName,
      href: `${WEBAPP_ROUTES.PERSON}/${p.id}`,
      id: p.id,
      lastName: p.lastName,
      latitude: p.latitude,
      longitude: p.longitude,
      name: [p.firstName, p.lastName].filter(Boolean).join(" "),
    }));
  }, [view, locationPins, addressPins]);

  const visibleLocationPins = useMemo(() => {
    const idSet = new Set(visibleMarkerIds);
    return locationPins.filter((p) => idSet.has(p.id));
  }, [locationPins, visibleMarkerIds]);

  const visibleAddressPins = useMemo(() => {
    const idSet = new Set(visibleMarkerIds);
    return addressPins.filter((p) => idSet.has(p.addressId));
  }, [addressPins, visibleMarkerIds]);

  const ADDRESS_TYPE_COLOR: Record<string, string> = {
    home: "blue",
    other: "gray",
    work: "grape",
  };

  const addressContactRows = useMemo<ContactTableRow[]>(
    () =>
      visibleAddressPins.map((pin) => ({
        _addressType: pin.addressType,
        _rowKey: pin.addressId,
        avatar: pin.avatar,
        firstName: pin.firstName,
        headline: null,
        id: pin.personId,
        lastInteraction: null,
        lastName: pin.lastName,
        location:
          pin.addressFormatted ??
          [pin.addressCity, pin.addressCountry].filter(Boolean).join(", ") ??
          null,
        middleName: null,
      })),
    [visibleAddressPins],
  );

  const [tableSearch, setTableSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nameAsc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const columnLabels = useMemo(
    () =>
      Object.fromEntries(
        MAP_TABLE_COLUMN_KEYS.map((key) => [key, columnDefinitions[key].label]),
      ) as Record<ColumnKey, string>,
    [columnDefinitions],
  );

  const columnIcons: Record<ColumnKey, ReactNode> = {
    avatar: null,
    email: null,
    headline: <IconBriefcase size={16} />,
    lastInteraction: <IconClock size={16} />,
    location: <IconMapPin size={16} />,
    name: <IconUser size={16} />,
    phone: null,
    social: <IconBrandLinkedin size={16} />,
  };

  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    MAP_TABLE_COLUMN_KEYS.map((key) => ({
      fixed: key === "name",
      icon: columnIcons[key],
      key,
      label: columnDefinitions[key].label,
      visible: key !== "social",
    })),
  );

  useEffect(() => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        label: columnLabels[col.key as ColumnKey] ?? col.label,
      })),
    );
  }, [columnLabels]);

  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

  useEffect(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

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
      ? addressContactRows.filter((r) => formatContactName(r).toLowerCase().includes(query))
      : addressContactRows;
    return sortPins(base, sortOrder);
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
      for (const rid of rangeIds) {
        if (shouldSelect) {
          next.add(rid);
        } else {
          next.delete(rid);
        }
      }
      setSelectedIds(next);
      setLastSelectedIndex(currentIndex);
      return;
    }

    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
    if (currentIndex >= 0) {
      setLastSelectedIndex(currentIndex);
    }
  };

  const handleDeleteContact = (contactId: string) => {
    const target = locationPins.find((p) => p.id === contactId);
    openDeleteContactModal({
      contactId,
      contactName: target
        ? [target.firstName, target.lastName].filter(Boolean).join(" ")
        : tPeople("ThisContactFallback"),
      onDeleted: async () => {
        setSelectedIds(new Set());
      },
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    openDeleteContactsModal({
      contactIds: ids,
      onDeleted: async () => {
        setSelectedIds(new Set());
      },
    });
  };

  const openMergeModal = (leftPersonId: string, rightPersonId?: string, lockBoth?: boolean) => {
    openMergeWithModal({
      contacts: visibleLocationPins as Contact[],
      disableLeftPicker: true,
      disableRightPicker: Boolean(lockBoth),
      leftPersonId,
      rightPersonId,
    });
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          helpDoc="concepts.map"
          helpLabel={t("Subtitle")}
          icon={IconMap2}
          secondaryAction={
            <SegmentedControl
              data={[
                {
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconMapPin size={14} />
                      <span>{t("ViewLocations")}</span>
                    </Group>
                  ),
                  value: "locations",
                },
                {
                  label: (
                    <Group gap={6} wrap="nowrap">
                      <IconHome size={14} />
                      <span>{t("ViewAddresses")}</span>
                    </Group>
                  ),
                  value: "addresses",
                },
              ]}
              onChange={handleViewChange}
              size="xs"
              value={view}
            />
          }
          title={t("Title")}
        />

        <LocationLookupInput
          label={t("SearchLabel")}
          onChange={setLocationQuery}
          onSuggestionSelect={handleLocationSelect}
          placeholder={t("SearchPlaceholder")}
          value={locationQuery}
        />

        <Box pos="relative">
          <PeopleMap
            center={[35, -25]}
            disableAutoFit
            focus={mapFocus}
            height={560}
            markers={markers}
            onBoundsChange={handleBoundsChange}
            onVisibleMarkerIdsChange={setVisibleMarkerIds}
            zoom={3}
          />
          {showPinsFetching ? (
            <Box
              pos="absolute"
              px="sm"
              py={6}
              right={12}
              style={{
                backgroundColor: "var(--mantine-color-body)",
                borderRadius: "var(--mantine-radius-md)",
                boxShadow: "var(--mantine-shadow-sm)",
                zIndex: 500,
              }}
              top={12}
            >
              <Group gap="xs" wrap="nowrap">
                <Loader aria-hidden size="xs" />
                <Text c="dimmed" size="xs">
                  {t("RefreshingPins")}
                </Text>
              </Group>
            </Box>
          ) : null}
        </Box>

        {view === "addresses" ? (
          <Paper p="md" radius="md" shadow="sm" withBorder>
            <ContactsTable
              allSelected={allSelected}
              columnsForMenu={columns}
              contacts={filteredAddressRows}
              isHeaderShown={true}
              noContactsFound={t("NoAddressesFound")}
              noContactsMatchSearch={t("NoAddressesMatchSearch")}
              onSearchChange={handleTableSearch}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              renderLocationCell={(contact) => {
                const type = (contact as ContactTableRow)._addressType;
                const addr = contact.location || "—";
                return (
                  <Group gap={6} style={{ minWidth: 0 }} wrap="nowrap">
                    <Badge
                      color={ADDRESS_TYPE_COLOR[type] ?? "gray"}
                      size="xs"
                      style={{ flexShrink: 0 }}
                      variant="light"
                    >
                      {type}
                    </Badge>
                    <Tooltip label={addr} withArrow>
                      <Text lineClamp={1} size="sm">
                        {addr}
                      </Text>
                    </Tooltip>
                  </Group>
                );
              }}
              searchLoading={showPinsFetching}
              selectedIds={selectedIds}
              setColumnsForMenu={setColumns}
              setSortOrderForMenu={setSortOrder}
              showSelection
              someSelected={someSelected}
              sortOrderForMenu={sortOrder}
              standardActions={{
                onAddToGroupsOne: (contactId) =>
                  openAddPeopleToGroupSelectionModal({
                    personIds: [contactId],
                  }),
                onAddToGroupsSelected: (contactIds) =>
                  openAddPeopleToGroupSelectionModal({ personIds: contactIds }),
                onDeleteOne: handleDeleteContact,
                onDeleteSelected: handleBulkDelete,
                onMergeOne: (contactId) => openMergeModal(contactId),
                onMergeSelected: (leftContactId, rightContactId) =>
                  openMergeModal(leftContactId, rightContactId, true),
              }}
              visibleColumns={visibleColumns}
            />
          </Paper>
        ) : (
          <Paper p="md" radius="md" shadow="sm" withBorder>
            <ContactsTable
              allSelected={allSelected}
              columnsForMenu={columns}
              contacts={filteredPins as Contact[]}
              isHeaderShown={true}
              noContactsFound={t("NoContactsFound")}
              noContactsMatchSearch={t("NoContactsMatchSearch")}
              onSearchChange={handleTableSearch}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              searchLoading={showPinsFetching}
              selectedIds={selectedIds}
              setColumnsForMenu={setColumns}
              setSortOrderForMenu={setSortOrder}
              showSelection
              someSelected={someSelected}
              sortOrderForMenu={sortOrder}
              standardActions={{
                onAddToGroupsOne: (contactId) =>
                  openAddPeopleToGroupSelectionModal({
                    personIds: [contactId],
                  }),
                onAddToGroupsSelected: (contactIds) =>
                  openAddPeopleToGroupSelectionModal({ personIds: contactIds }),
                onDeleteOne: handleDeleteContact,
                onDeleteSelected: handleBulkDelete,
                onMergeOne: (contactId) => openMergeModal(contactId),
                onMergeSelected: (leftContactId, rightContactId) =>
                  openMergeModal(leftContactId, rightContactId, true),
              }}
              visibleColumns={visibleColumns}
            />
          </Paper>
        )}
      </Stack>
    </PageWrapper>
  );
}
