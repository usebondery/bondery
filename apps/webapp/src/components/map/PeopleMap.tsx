"use client";

import dynamic from "next/dynamic";
import type { MapSelfLocation } from "./useMapGeolocation";

export interface PeopleMapMarker {
  avatarUrl?: string | null;
  firstName?: string;
  headline?: string | null;
  href?: string;
  id: string;
  lastName?: string | null;
  latitude: number;
  location?: string | null;
  longitude: number;
  name: string;
  /** Person id for hover preview when `id` is not the person id (address pins). */
  personId?: string;
}

export interface PeopleMapFocus {
  latitude: number;
  longitude: number;
  token: string;
  zoom?: number;
}

export interface MapBounds {
  maxLat: number;
  maxLon: number;
  minLat: number;
  minLon: number;
}

/** Map center + zoom (URL camera sync and viewport listeners). */
export interface MapCamera {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface PeopleMapSelfMarker {
  ariaLabel: string;
  avatarUrl: string | null;
  displayName: string;
}

/** Optional third control in the zoom ActionIcon.Group (map page only). */
export interface PeopleMapMyLocationControl {
  ariaLabel: string;
  disabled: boolean;
  disabledTooltip?: string;
  loading: boolean;
  onClick: () => void;
}

interface PeopleMapProps {
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
  /** Fires on moveend/zoomend/load with the current center and zoom. */
  onCameraChange?: (camera: MapCamera) => void;
  /** Fires once when MapLibre style is loaded and the map is interactive. */
  onReady?: () => void;
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
  scrollWheelZoom?: boolean;
  selfLocation?: MapSelfLocation | null;
  selfMarker?: PeopleMapSelfMarker | null;
  zoom?: number;
}

const PeopleMapClient = dynamic(
  () => import("./PeopleMapClient").then((mod) => mod.PeopleMapClient),
  { ssr: false },
);

export function PeopleMap({
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
}: PeopleMapProps) {
  return (
    <PeopleMapClient
      center={center}
      disableAutoFit={disableAutoFit}
      disableChipNavigation={disableChipNavigation}
      focus={focus}
      height={height}
      hideZoomControls={hideZoomControls}
      loading={loading}
      markers={markers}
      myLocationControl={myLocationControl}
      onBoundsChange={onBoundsChange}
      onCameraChange={onCameraChange}
      onReady={onReady}
      onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
      scrollWheelZoom={scrollWheelZoom}
      selfLocation={selfLocation}
      selfMarker={selfMarker}
      zoom={zoom}
    />
  );
}
