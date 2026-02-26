"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Avatar, MantineProvider } from "@mantine/core";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DivIcon } from "leaflet";
import { useRouter } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import MarkerClusterGroup from "react-leaflet-cluster";
import { bonderyTheme } from "@bondery/mantine-next";
import "maplibre-gl/dist/maplibre-gl.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { PersonChip } from "@/app/(app)/app/components/shared/PersonChip";
import type { PeopleMapFocus, PeopleMapMarker } from "./PeopleMap";

interface PeopleMapClientProps {
  markers: PeopleMapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: number;
  scrollWheelZoom?: boolean;
  focus?: PeopleMapFocus | null;
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
  disableChipNavigation?: boolean;
}

export function PeopleMapClient({
  markers,
  center,
  zoom = 13,
  height = 360,
  scrollWheelZoom = true,
  focus,
  onVisibleMarkerIdsChange,
  disableChipNavigation = false,
}: PeopleMapClientProps) {
  const router = useRouter();

  // Default center over the Atlantic so both USA and Europe are visible at low zoom
  const defaultCenter = center || ([35, -25] as [number, number]);

  const iconById = useMemo(() => {
    const map = new Map<string, DivIcon>();

    for (const marker of markers) {
      const nameParts = marker.name.trim().split(/\s+/).filter(Boolean);
      const firstName = marker.firstName || nameParts[0] || marker.name;
      const lastName =
        marker.lastName ?? (nameParts.length > 1 ? nameParts.slice(1).join(" ") : null);

      const avatarHtml = renderToStaticMarkup(
        <MantineProvider theme={bonderyTheme} defaultColorScheme="auto">
          <div style={{ transform: "translate(-6px, -8px)" }}>
            <PersonChip
              person={{
                id: marker.id,
                firstName,
                lastName,
                avatar: marker.avatarUrl || null,
              }}
              size="sm"
              isClickable={!disableChipNavigation}
              badgeVariant="filled"
            />
          </div>
        </MantineProvider>,
      );

      map.set(
        marker.id,
        new DivIcon({
          className: "person-map-avatar-icon",
          html: avatarHtml,
          iconSize: [160, 38],
          iconAnchor: [28, 34],
        }),
      );
    }

    return map;
  }, [disableChipNavigation, markers]);

  return (
    <div
      style={{ position: "relative", zIndex: 0, borderRadius: "12px", overflow: "hidden", height }}
    >
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: "100%", width: "100%" }}
      >
        <MapFocusController focus={focus} defaultZoom={zoom} />
        <VisibleMarkersController
          markers={markers}
          onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom
          maxClusterRadius={50}
          iconCreateFunction={(cluster) => {
            const clusterHtml = renderToStaticMarkup(
              <MantineProvider theme={bonderyTheme} defaultColorScheme="auto">
                <div style={{ opacity: 1 }}>
                  <Avatar
                    size={38}
                    radius="xl"
                    variant="filled"
                    color="blue"
                    name={String(cluster.getChildCount())}
                  />
                </div>
              </MantineProvider>,
            );

            return new DivIcon({
              html: clusterHtml,
              className: "person-map-cluster-icon",
              iconSize: [38, 38],
              iconAnchor: [19, 19],
            });
          }}
        >
          {markers.map((marker) => (
            <Marker
              key={`${marker.id}-${marker.latitude}-${marker.longitude}`}
              position={[marker.latitude, marker.longitude]}
              icon={iconById.get(marker.id)}
              eventHandlers={
                marker.href
                  ? {
                      click: () => {
                        router.push(marker.href as string);
                      },
                    }
                  : undefined
              }
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

interface MapFocusControllerProps {
  focus?: PeopleMapFocus | null;
  defaultZoom: number;
}

function MapFocusController({ focus, defaultZoom }: MapFocusControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!focus) {
      return;
    }

    map.flyTo([focus.latitude, focus.longitude], focus.zoom ?? defaultZoom, { animate: true });
  }, [defaultZoom, focus, map]);

  return null;
}

interface VisibleMarkersControllerProps {
  markers: PeopleMapMarker[];
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
}

function VisibleMarkersController({
  markers,
  onVisibleMarkerIdsChange,
}: VisibleMarkersControllerProps) {
  const lastVisibleIdsRef = useRef<string[]>([]);

  const notify = useCallback(
    (map: ReturnType<typeof useMap>) => {
      if (!onVisibleMarkerIdsChange) {
        return;
      }

      const bounds = map.getBounds();
      const visibleIds = markers
        .filter((marker) => bounds.contains([marker.latitude, marker.longitude]))
        .map((marker) => marker.id);

      const previous = lastVisibleIdsRef.current;
      const isSame =
        previous.length === visibleIds.length &&
        previous.every((markerId, index) => markerId === visibleIds[index]);

      if (isSame) {
        return;
      }

      lastVisibleIdsRef.current = visibleIds;
      onVisibleMarkerIdsChange(visibleIds);
    },
    [markers, onVisibleMarkerIdsChange],
  );

  const map = useMapEvents({
    moveend: () => notify(map),
    zoomend: () => notify(map),
  });

  useEffect(() => {
    notify(map);
  }, [map, notify]);

  return null;
}
