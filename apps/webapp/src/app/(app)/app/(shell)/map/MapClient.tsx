"use client";

import { Stack } from "@mantine/core";
import { IconMap2 } from "@tabler/icons-react";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { useUserSession } from "@/components/shell/UserSessionProvider";
import { useMapPageTranslations } from "@/lib/i18n/generated/hooks";
import { useMapViewportPins } from "@/lib/query/hooks/useMapViewportPins";
import { MapCanvas } from "./components/MapCanvas";
import { MapPinsTable } from "./components/MapPinsTable";
import { useDerivedMapPins } from "./hooks/useDerivedMapPins";
import { useMapCamera } from "./hooks/useMapCamera";
import { useMapLocationSearch } from "./hooks/useMapLocationSearch";
import { useMapMyLocation } from "./hooks/useMapMyLocation";
import { useMapPinsTable } from "./hooks/useMapPinsTable";
import { useMapTableColumns } from "./hooks/useMapTableColumns";
import type { MapView } from "./utils/types";

interface MapClientProps {
  view: MapView;
}

export function MapClient({ view }: MapClientProps) {
  const t = useMapPageTranslations();
  const { avatarUrl, displayName } = useUserSession();

  const { grantedSelfLocation, handleCameraChange, handleViewChange, pinsCamera, resolvedCamera } =
    useMapCamera(view);

  const { handleLocationSelect, locationQuery, mapFocus, setLocationQuery, setMapFocus } =
    useMapLocationSearch();
  const [mapReady, setMapReady] = useState(false);
  const [visibleMarkerIds, setVisibleMarkerIds] = useState<string[]>([]);

  const { myLocationControl, selfLocation } = useMapMyLocation({
    grantedSelfLocation,
    onFocus: setMapFocus,
  });

  const { locationPins, addressPins, isFetching } = useMapViewportPins(view, pinsCamera);

  const { addressContactRows, markers, visibleLocationPins } = useDerivedMapPins({
    addressPins,
    locationPins,
    view,
    visibleMarkerIds,
  });

  const { columns, setColumns, visibleColumns } = useMapTableColumns();
  const table = useMapPinsTable({ addressContactRows, locationPins, visibleLocationPins });
  const handleReady = () => {
    setMapReady(true);
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

        <MapCanvas
          avatarUrl={avatarUrl}
          displayName={displayName}
          fetchingStatus={isFetching ? t("RefreshingPins") : null}
          focus={mapFocus}
          locationQuery={locationQuery}
          mapReady={mapReady}
          markers={markers}
          myLocationControl={myLocationControl}
          myLocationMarkerLabel={t("MyLocationMarker")}
          onCameraChange={handleCameraChange}
          onLocationQueryChange={setLocationQuery}
          onLocationSelect={handleLocationSelect}
          onReady={handleReady}
          onViewChange={handleViewChange}
          onVisibleMarkerIdsChange={setVisibleMarkerIds}
          resolvedCamera={resolvedCamera}
          selfLocation={selfLocation}
          view={view}
        />

        {mapReady ? (
          <MapPinsTable
            columns={columns}
            isFetching={isFetching}
            setColumns={setColumns}
            table={table}
            view={view}
            visibleColumns={visibleColumns}
          />
        ) : null}
      </Stack>
    </PageWrapper>
  );
}
