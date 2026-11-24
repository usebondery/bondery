"use client";

import { Box, Skeleton } from "@mantine/core";
import {
  type MapCamera,
  PeopleMap,
  type PeopleMapFocus,
  type PeopleMapMyLocationControl,
  type PeopleMapProps,
} from "@/components/map/PeopleMap";
import type { MapSelfLocation } from "@/components/map/useMapGeolocation";
import { MAP_CORNER_RADIUS_PX, MAP_HEIGHT_PX } from "../utils/mapConstants";
import type { MapView } from "../utils/types";
import { MapControlsPanel } from "./MapControlsPanel";

interface MapCanvasProps {
  avatarUrl: string | null;
  displayName: string;
  fetchingStatus: string | null;
  focus: PeopleMapFocus | null;
  locationQuery: string;
  mapReady: boolean;
  markers: PeopleMapProps["markers"];
  myLocationControl: PeopleMapMyLocationControl;
  myLocationMarkerLabel: string;
  onCameraChange: PeopleMapProps["onCameraChange"];
  onLocationQueryChange: (value: string) => void;
  onLocationSelect: Parameters<typeof MapControlsPanel>[0]["onLocationSelect"];
  onReady: () => void;
  onViewChange: (value: string) => void;
  onVisibleMarkerIdsChange: (ids: string[]) => void;
  resolvedCamera: MapCamera | null;
  selfLocation: MapSelfLocation | null;
  view: MapView;
}

/** The map surface plus its controls overlay, and a skeleton until the first paint. */
export function MapCanvas({
  avatarUrl,
  displayName,
  fetchingStatus,
  focus,
  locationQuery,
  mapReady,
  markers,
  myLocationControl,
  myLocationMarkerLabel,
  onCameraChange,
  onLocationQueryChange,
  onLocationSelect,
  onReady,
  onViewChange,
  onVisibleMarkerIdsChange,
  resolvedCamera,
  selfLocation,
  view,
}: MapCanvasProps) {
  return (
    <Box aria-busy={!mapReady} pos="relative">
      {resolvedCamera === null || !mapReady ? (
        <Skeleton height={MAP_HEIGHT_PX} radius={MAP_CORNER_RADIUS_PX} />
      ) : null}

      {resolvedCamera ? (
        <Box
          dir="ltr"
          h={MAP_HEIGHT_PX}
          left={mapReady ? undefined : 0}
          pos={mapReady ? "relative" : "absolute"}
          top={mapReady ? undefined : 0}
          w="100%"
        >
          <PeopleMap
            center={[resolvedCamera.latitude, resolvedCamera.longitude]}
            disableAutoFit
            fetchingStatus={fetchingStatus}
            focus={focus}
            height={MAP_HEIGHT_PX}
            markers={markers}
            myLocationControl={myLocationControl}
            onCameraChange={onCameraChange}
            onReady={onReady}
            onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
            selfLocation={selfLocation}
            selfMarker={
              selfLocation
                ? {
                    ariaLabel: myLocationMarkerLabel,
                    avatarUrl,
                    displayName,
                  }
                : null
            }
            zoom={resolvedCamera.zoom}
          />
        </Box>
      ) : null}

      {mapReady ? (
        <MapControlsPanel
          locationQuery={locationQuery}
          onLocationQueryChange={onLocationQueryChange}
          onLocationSelect={onLocationSelect}
          onViewChange={onViewChange}
          view={view}
        />
      ) : null}
    </Box>
  );
}
