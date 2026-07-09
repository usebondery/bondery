"use client";

import dynamic from "next/dynamic";

export interface PeopleMapMarker {
  avatarUrl?: string | null;
  firstName?: string;
  href?: string;
  id: string;
  lastName?: string | null;
  latitude: number;
  longitude: number;
  name: string;
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

interface PeopleMapProps {
  center?: [number, number];
  disableAutoFit?: boolean;
  disableChipNavigation?: boolean;
  focus?: PeopleMapFocus | null;
  height?: number;
  markers: PeopleMapMarker[];
  onBoundsChange?: (bounds: MapBounds) => void;
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
  scrollWheelZoom?: boolean;
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
  onVisibleMarkerIdsChange,
  onBoundsChange,
  disableAutoFit = false,
  disableChipNavigation = false,
}: PeopleMapProps) {
  return (
    <PeopleMapClient
      center={center}
      disableAutoFit={disableAutoFit}
      disableChipNavigation={disableChipNavigation}
      focus={focus}
      height={height}
      markers={markers}
      onBoundsChange={onBoundsChange}
      onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
      scrollWheelZoom={scrollWheelZoom}
      zoom={zoom}
    />
  );
}
