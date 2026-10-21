// biome-ignore-all lint/style/noExcessiveLinesPerFile: map client coordinates pins, table, and filters in one place
// biome-ignore-all lint/nursery/useReactCompiler: map syncs table columns and selection with viewport-driven pin data
"use client";

import type { ContactNameFields } from "@bondery/helpers/contact";
import { formatContactName } from "@bondery/helpers/contact";
import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { Contact, ContactAddressEntry } from "@bondery/schemas";
import {
  Badge,
  Box,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconBrandLinkedin,
  IconBriefcase,
  IconClock,
  IconHome,
  IconMap2,
  IconMapPin,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useDeferredValue, useEffect, useState } from "react";
import { openAddPeopleToGroupSelectionModal } from "@/app/(app)/app/(shell)/people/components/modals/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "@/app/(app)/app/(shell)/people/components/modals/MergeWithModal";
import type { ColumnKey } from "@/components/contacts/ContactsTableV2";
import ContactsTable, {
  type ColumnConfig,
  type ContactTableRow,
  type SortOrder,
} from "@/components/contacts/ContactsTableV2";
import { openDeleteContactModal } from "@/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/components/contacts/openDeleteContactsModal";
import { type MapCamera, PeopleMap, type PeopleMapFocus } from "@/components/map/PeopleMap";
import {
  type MapGeolocationFailureStatus,
  useMapGeolocation,
} from "@/components/map/useMapGeolocation";
import { LocationLookupInput } from "@/components/shell/LocationLookupInput";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { useUserSession } from "@/components/shell/UserSessionProvider";
import {
  useCommonTranslations,
  useMapPageTranslations,
  usePeoplePageTranslations,
} from "@/lib/i18n/generated/hooks";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { routeWithQuery } from "@/lib/navigation/route/query";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useMapViewportPins } from "@/lib/query/hooks/useMapViewportPins";
import {
  applyMapCameraToSearchParams,
  isSameMapCameraInSearchParams,
  parseMapCameraSearchParams,
} from "./utils/mapUrlCamera";
import type { MapView } from "./utils/types";

const MAP_TABLE_COLUMN_KEYS: ColumnKey[] = [
  "name",
  "headline",
  "location",
  "lastInteraction",
  "social",
];

const MAP_HEIGHT_PX = 560;
const MAP_CORNER_RADIUS_PX = 12;
/** Above the map canvas only — keep below Mantine Tooltip portals (~300). */
const MAP_CHROME_Z_INDEX = 5;
/** Default camera when URL has no valid latitude/longitude/zoom (Atlantic overview). */
const DEFAULT_MAP_CAMERA: MapCamera = { latitude: 35, longitude: -25, zoom: 3 };

interface MapClientProps {
  view: MapView;
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

export function MapClient({ view }: MapClientProps) {
  const t = useMapPageTranslations();
  const tCommon = useCommonTranslations();
  const tPeople = usePeoplePageTranslations();
  const { columnDefinitions } = useContactsTableCopy();
  const { avatarUrl, displayName } = useUserSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isDisabled: isMyLocationDisabled,
    isPrompting: isMyLocationPrompting,
    requestLocation,
    selfLocation,
    status: geolocationStatus,
  } = useMapGeolocation();

  // Initial mount only — do not soft-control the live camera from URL updates.
  const [initialCamera] = useState(
    () => parseMapCameraSearchParams(searchParams) ?? DEFAULT_MAP_CAMERA,
  );

  const [locationQuery, setLocationQuery] = useState("");
  const [mapFocus, setMapFocus] = useState<PeopleMapFocus | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [visibleMarkerIds, setVisibleMarkerIds] = useState<string[]>([]);

  // Live camera from URL after pan/zoom; fall back to mount camera when URL has none yet.
  const pinsCamera = parseMapCameraSearchParams(searchParams) ?? initialCamera;

  const { locationPins, addressPins, isFetching, isLoading, isPlaceholderData } =
    useMapViewportPins(view, pinsCamera);
  const showPinsFetching = isFetching && !isLoading && !isPlaceholderData;

  const geolocationFailureMessage = (status: MapGeolocationFailureStatus): string => {
    switch (status) {
      case "denied":
        return t("MyLocationDenied");
      case "unavailable":
        return t("MyLocationUnavailable");
      case "timeout":
        return t("MyLocationTimeout");
      case "insecure":
        return t("MyLocationInsecure");
      case "unsupported":
        return t("MyLocationUnsupported");
    }
  };

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

  const handleMyLocation = () => {
    void requestLocation().then((result) => {
      if (result.ok) {
        setMapFocus({
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          token: `self-${Date.now()}`,
          zoom: 14,
        });
        return;
      }

      notifications.show(
        errorNotificationTemplate({
          description: geolocationFailureMessage(result.status),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    });
  };

  const handleCameraChange = useDebouncedCallback((camera: MapCamera) => {
    if (isSameMapCameraInSearchParams(searchParams, camera)) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    applyMapCameraToSearchParams(params, camera);
    if (!params.has("view")) {
      params.set("view", view);
    }
    router.replace(routeWithQuery(pathname, params));
  }, DEBOUNCE_MS.mapViewport);

  useEffect(() => {
    setVisibleMarkerIds([]);
  }, []);

  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    router.replace(routeWithQuery(pathname, params));
  };

  const myLocationDisabledTooltip =
    geolocationStatus === "insecure"
      ? t("MyLocationInsecure")
      : geolocationStatus === "unsupported"
        ? t("MyLocationUnsupported")
        : undefined;

  const markers =
    view === "addresses"
      ? addressPins.map((p) => ({
          avatarUrl: p.avatar,
          firstName: p.firstName,
          href: `${WEBAPP_ROUTES.PERSON}/${p.personId}`,
          id: p.addressId,
          lastName: p.lastName,
          latitude: p.latitude,
          location:
            p.addressFormatted ??
            ([p.addressCity, p.addressCountry].filter(Boolean).join(", ") || null),
          longitude: p.longitude,
          name: [p.firstName, p.lastName].filter(Boolean).join(" "),
          personId: p.personId,
        }))
      : locationPins.map((p) => ({
          avatarUrl: p.avatar,
          firstName: p.firstName,
          headline: p.headline,
          href: `${WEBAPP_ROUTES.PERSON}/${p.id}`,
          id: p.id,
          lastName: p.lastName,
          latitude: p.latitude,
          location: p.location,
          longitude: p.longitude,
          name: [p.firstName, p.lastName].filter(Boolean).join(" "),
        }));

  const visibleLocationPinIdSet = new Set(visibleMarkerIds);
  const visibleLocationPins = locationPins.filter((p) => visibleLocationPinIdSet.has(p.id));

  const visibleAddressPinIdSet = new Set(visibleMarkerIds);
  const visibleAddressPins = addressPins.filter((p) => visibleAddressPinIdSet.has(p.addressId));

  const ADDRESS_TYPE_COLOR: Record<string, string> = {
    home: "blue",
    other: "gray",
    work: "grape",
  };

  const addressContactRows = visibleAddressPins.map(
    (pin): ContactTableRow => ({
      _addressType: pin.addressType,
      _rowKey: pin.addressId,
      avatar: pin.avatar,
      createdAt: "",
      emails: [],
      facebook: null,
      firstName: pin.firstName,
      gisPoint: null,
      headline: null,
      id: pin.personId,
      importantDates: null,
      instagram: null,
      keepFrequencyDays: null,
      language: null,
      lastInteraction: null,
      lastInteractionActivityId: null,
      lastName: pin.lastName,
      latitude: null,
      linkedin: null,
      location:
        pin.addressFormatted ??
        [pin.addressCity, pin.addressCountry].filter(Boolean).join(", ") ??
        null,
      longitude: null,
      middleName: null,
      myself: false,
      notes: null,
      phones: [],
      signal: null,
      timezone: null,
      updatedAt: "",
      userId: "",
      website: null,
      whatsapp: null,
    }),
  );

  const [tableSearch, setTableSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("nameAsc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const columnLabels = Object.fromEntries(
    MAP_TABLE_COLUMN_KEYS.map((key) => [key, columnDefinitions[key].label]),
  ) as Record<ColumnKey, string>;

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

  const tableSearchQuery = tableSearch.trim().toLowerCase();
  const filteredPinsBase = tableSearchQuery
    ? visibleLocationPins.filter((p) =>
        [p.firstName, p.lastName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(tableSearchQuery),
      )
    : visibleLocationPins;
  const filteredPins = sortPins(filteredPinsBase, sortOrder);

  const filteredAddressRowsBase = tableSearchQuery
    ? addressContactRows.filter((r) =>
        formatContactName(r).toLowerCase().includes(tableSearchQuery),
      )
    : addressContactRows;
  const filteredAddressRows = sortPins(filteredAddressRowsBase, sortOrder);

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
          title={t("Title")}
        />

        <Box aria-busy={!mapReady} pos="relative">
          <PeopleMap
            center={[initialCamera.latitude, initialCamera.longitude]}
            disableAutoFit
            focus={mapFocus}
            height={MAP_HEIGHT_PX}
            markers={markers}
            myLocationControl={{
              ariaLabel: isMyLocationPrompting ? t("MyLocationLocating") : t("MyLocation"),
              disabled: isMyLocationDisabled,
              disabledTooltip: myLocationDisabledTooltip,
              loading: isMyLocationPrompting,
              onClick: handleMyLocation,
            }}
            onCameraChange={handleCameraChange}
            onReady={() => {
              setMapReady(true);
            }}
            onVisibleMarkerIdsChange={setVisibleMarkerIds}
            selfLocation={selfLocation}
            selfMarker={
              selfLocation
                ? {
                    ariaLabel: t("MyLocationMarker"),
                    avatarUrl,
                    displayName,
                  }
                : null
            }
            zoom={initialCamera.zoom}
          />

          {!mapReady ? (
            <Skeleton
              height={MAP_HEIGHT_PX}
              radius={MAP_CORNER_RADIUS_PX}
              style={{ inset: 0, position: "absolute", zIndex: MAP_CHROME_Z_INDEX }}
              width="100%"
            />
          ) : null}

          {mapReady ? (
            <Paper
              p="xs"
              pos="absolute"
              radius="md"
              right={12}
              shadow="sm"
              style={{ width: "min(320px, calc(100% - 96px))", zIndex: MAP_CHROME_Z_INDEX }}
              top={12}
            >
              <Stack gap="xs">
                <SegmentedControl
                  data={[
                    {
                      label: (
                        <Tooltip label={t("ViewLocationsTooltip")} openDelay={400}>
                          <Group gap={6} justify="center" wrap="nowrap">
                            <IconMapPin size={14} />
                            <span>{t("ViewLocations")}</span>
                          </Group>
                        </Tooltip>
                      ),
                      value: "locations",
                    },
                    {
                      label: (
                        <Tooltip label={t("ViewAddressesTooltip")} openDelay={400}>
                          <Group gap={6} justify="center" wrap="nowrap">
                            <IconHome size={14} />
                            <span>{t("ViewAddresses")}</span>
                          </Group>
                        </Tooltip>
                      ),
                      value: "addresses",
                    },
                  ]}
                  fullWidth
                  onChange={handleViewChange}
                  size="xs"
                  value={view}
                />
                <LocationLookupInput
                  ariaLabel={t("SearchLabel")}
                  leftSection={<IconSearch size={16} />}
                  onChange={setLocationQuery}
                  onSuggestionSelect={handleLocationSelect}
                  placeholder={t("SearchPlaceholder")}
                  value={locationQuery}
                />
              </Stack>
            </Paper>
          ) : null}

          {mapReady && showPinsFetching ? (
            <Paper
              left="50%"
              pos="absolute"
              px="sm"
              py={6}
              radius="md"
              shadow="sm"
              style={{ transform: "translateX(-50%)", zIndex: MAP_CHROME_Z_INDEX }}
              top={12}
              withBorder
            >
              <Group gap="xs" wrap="nowrap">
                <Loader aria-hidden size="xs" />
                <Text size="xs">{t("RefreshingPins")}</Text>
              </Group>
            </Paper>
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
                      color={ADDRESS_TYPE_COLOR[type ?? "other"] ?? "gray"}
                      size="xs"
                      style={{ flexShrink: 0 }}
                      variant="light"
                    >
                      {type}
                    </Badge>
                    <Tooltip label={addr}>
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
