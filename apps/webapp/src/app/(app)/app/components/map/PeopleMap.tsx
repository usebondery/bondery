"use client";

import dynamic from "next/dynamic";

export interface PeopleMapMarker {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string | null;
  latitude: number;
  longitude: number;
  avatarUrl?: string | null;
  href?: string;
}

export interface PeopleMapFocus {
  latitude: number;
  longitude: number;
  zoom?: number;
  token: string;
}

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface PeopleMapProps {
  markers: PeopleMapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: number;
  scrollWheelZoom?: boolean;
  focus?: PeopleMapFocus | null;
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  disableAutoFit?: boolean;
  disableChipNavigation?: boolean;
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
      markers={markers}
      center={center}
      zoom={zoom}
      height={height}
      scrollWheelZoom={scrollWheelZoom}
      focus={focus}
      onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
      onBoundsChange={onBoundsChange}
      disableAutoFit={disableAutoFit}
      disableChipNavigation={disableChipNavigation}
    />
  );
}
