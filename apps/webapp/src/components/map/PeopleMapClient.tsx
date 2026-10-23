// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync for React Compiler
"use client";

import { Paper, Skeleton } from "@mantine/core";
import { AttributionControl, Map as MapLibreMap, Marker } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useRef, useState } from "react";
import { ClusteredPersonMarkers } from "./ClusteredPersonMarkers";
import { ensureMapLibreWorker } from "./ensureMapLibreWorker";
import { SelfMapAvatarMarker } from "./mapMarkerIcons";
import { OSM_ATTRIBUTION, OSM_RASTER_STYLE } from "./osmRasterStyle";
import type {
  MapBounds,
  MapCamera,
  PeopleMapFocus,
  PeopleMapMarker,
  PeopleMapMyLocationControl,
  PeopleMapSelfMarker,
} from "./PeopleMap";
import {
  FitMarkersController,
  MapFocusController,
  MapZoomControls,
  VisibleMarkersController,
} from "./peopleMapControllers";
import type { MapSelfLocation } from "./useMapGeolocation";

ensureMapLibreWorker();

const SELF_MARKER_ID = "__self__";
const MAP_CORNER_RADIUS_PX = 12;

interface PeopleMapClientProps {
  center?: [number, number];
  disableAutoFit?: boolean;
  disableChipNavigation?: boolean;
  focus?: PeopleMapFocus | null;
  height?: number;
  hideZoomControls?: boolean;
  /** Force the map skeleton (in addition to waiting for MapLibre ready). */
  loading?: boolean;
  markers: PeopleMapMarker[];
  myLocationControl?: PeopleMapMyLocationControl | null;
  onBoundsChange?: (bounds: MapBounds) => void;
  onCameraChange?: (camera: MapCamera) => void;
  /** Fires once when MapLibre style is loaded and the map is interactive. */
  onReady?: () => void;
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
  scrollWheelZoom?: boolean;
  selfLocation?: MapSelfLocation | null;
  selfMarker?: PeopleMapSelfMarker | null;
  zoom?: number;
}

export function PeopleMapClient({
  markers,
  center,
  zoom = 13,
  height = 360,
  scrollWheelZoom = true,
  focus,
  hideZoomControls = false,
  loading = false,
  onVisibleMarkerIdsChange,
  onBoundsChange,
  onCameraChange,
  onReady,
  disableAutoFit = false,
  disableChipNavigation = false,
  myLocationControl = null,
  selfLocation = null,
  selfMarker = null,
}: PeopleMapClientProps) {
  // Default center over the Atlantic so both USA and Europe are visible at low zoom.
  // PeopleMap API keeps Leaflet order: [latitude, longitude].
  const defaultCenter = center || ([35, -25] as [number, number]);
  const [isMapReady, setIsMapReady] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const didNotifyReadyRef = useRef(false);

  const showSkeleton = loading || !isMapReady;
  const showZoomControls = !hideZoomControls && isMapReady && !loading;

  const handleMapLoad = () => {
    setIsMapReady(true);
    if (didNotifyReadyRef.current) {
      return;
    }
    didNotifyReadyRef.current = true;
    onReadyRef.current?.();
  };

  return (
    <Paper
      aria-busy={showSkeleton}
      h={height}
      pos="relative"
      radius={MAP_CORNER_RADIUS_PX}
      shadow="sm"
      style={{ overflow: "hidden", zIndex: 0 }}
      withBorder
    >
      <MapLibreMap
        attributionControl={false}
        initialViewState={{
          latitude: defaultCenter[0],
          longitude: defaultCenter[1],
          zoom,
        }}
        mapStyle={OSM_RASTER_STYLE}
        // Do not set maxBounds to ±180 — MapLibre constrain/resize crashes
        // (gl-matrix vec4 null) when bounds equal the full world. Leaflet used
        // extreme longitudes for worldCopyJump; MapLibre uses renderWorldCopies.
        onLoad={handleMapLoad}
        renderWorldCopies
        scrollZoom={scrollWheelZoom}
        style={{ height: "100%", width: "100%" }}
      >
        <AttributionControl compact={false} customAttribution={OSM_ATTRIBUTION} />
        {showZoomControls ? <MapZoomControls myLocationControl={myLocationControl} /> : null}
        <MapFocusController defaultZoom={zoom} focus={focus} />
        <FitMarkersController defaultZoom={zoom} disabled={disableAutoFit} markers={markers} />
        <VisibleMarkersController
          markers={markers}
          onBoundsChange={onBoundsChange}
          onCameraChange={onCameraChange}
          onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
        />
        <ClusteredPersonMarkers disableChipNavigation={disableChipNavigation} markers={markers} />
        {selfLocation && selfMarker ? (
          <Marker
            anchor="center"
            key={`${SELF_MARKER_ID}-${selfLocation.latitude}-${selfLocation.longitude}`}
            latitude={selfLocation.latitude}
            longitude={selfLocation.longitude}
            style={{ cursor: "default", pointerEvents: "none" }}
          >
            <SelfMapAvatarMarker
              ariaLabel={selfMarker.ariaLabel}
              avatarUrl={selfMarker.avatarUrl}
              displayName={selfMarker.displayName}
            />
          </Marker>
        ) : null}
      </MapLibreMap>
      {showSkeleton ? (
        <Skeleton
          height="100%"
          radius={MAP_CORNER_RADIUS_PX}
          style={{ inset: 0, position: "absolute", zIndex: 2 }}
          width="100%"
        />
      ) : null}
    </Paper>
  );
}
