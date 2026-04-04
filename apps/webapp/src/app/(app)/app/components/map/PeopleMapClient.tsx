"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Avatar, MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DivIcon } from "leaflet";
import { useRouter } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { MarkerCluster } from "leaflet";
import { PersonChip, bonderyTheme } from "@bondery/mantine-next";
import "maplibre-gl/dist/maplibre-gl.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { MapBounds, PeopleMapFocus, PeopleMapMarker } from "./PeopleMap";

interface PeopleMapClientProps {
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

export function PeopleMapClient({
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
        <MantineProvider
          theme={bonderyTheme}
          defaultColorScheme="auto"
          cssVariablesResolver={v8CssVariablesResolver}
        >
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
        worldCopyJump
        maxBounds={[
          [-85.051129, -100000],
          [85.051129, 100000],
        ]}
        maxBoundsViscosity={0.9}
      >
        <MapFocusController focus={focus} defaultZoom={zoom} />
        <FitMarkersController markers={markers} defaultZoom={zoom} disabled={disableAutoFit} />
        <VisibleMarkersController
          markers={markers}
          onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
          onBoundsChange={onBoundsChange}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom
          maxClusterRadius={50}
          iconCreateFunction={(cluster: MarkerCluster) => {
            const clusterHtml = renderToStaticMarkup(
              <MantineProvider
                theme={bonderyTheme}
                defaultColorScheme="auto"
                cssVariablesResolver={v8CssVariablesResolver}
              >
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

interface FitMarkersControllerProps {
  markers: PeopleMapMarker[];
  defaultZoom: number;
  disabled?: boolean;
}

/**
 * Re-centers the map whenever the set of markers changes (e.g. after an address
 * is added or updated). Skips the very first render so MapContainer's initial
 * `center` prop handles the page-load position.
 */
function FitMarkersController({
  markers,
  defaultZoom,
  disabled = false,
}: FitMarkersControllerProps) {
  const map = useMap();
  const prevKeyRef = useRef("");

  useEffect(() => {
    if (disabled) return;

    const key = markers.map((m) => `${m.latitude}:${m.longitude}`).join("|");

    if (prevKeyRef.current === key) return;

    const isFirstLoad = prevKeyRef.current === "";
    prevKeyRef.current = key;

    if (isFirstLoad || markers.length === 0) return;

    if (markers.length === 1) {
      map.flyTo([markers[0].latitude, markers[0].longitude], defaultZoom, { animate: true });
    } else {
      map.fitBounds(
        markers.map((m) => [m.latitude, m.longitude] as [number, number]),
        { padding: [40, 40], animate: true },
      );
    }
  }, [defaultZoom, map, markers]);

  return null;
}

interface VisibleMarkersControllerProps {
  markers: PeopleMapMarker[];
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}

function VisibleMarkersController({
  markers,
  onVisibleMarkerIdsChange,
  onBoundsChange,
}: VisibleMarkersControllerProps) {
  const lastVisibleIdsRef = useRef<string[]>([]);

  // Keep refs up to date so stable callbacks always see the latest values
  // without adding them to effect dependency arrays (which would cause re-runs).
  const markersRef = useRef(markers);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onVisibleMarkerIdsChangeRef = useRef(onVisibleMarkerIdsChange);
  markersRef.current = markers;
  onBoundsChangeRef.current = onBoundsChange;
  onVisibleMarkerIdsChangeRef.current = onVisibleMarkerIdsChange;

  // Emit current viewport bounds — intentionally stable (empty deps, reads from ref).
  // Only fires on initial mount + map events, NOT when markers change.
  // This breaks the fetch → markers → notify → fetch infinite loop.
  const emitBounds = useCallback((m: ReturnType<typeof useMap>) => {
    if (!onBoundsChangeRef.current) return;
    const b = m.getBounds();
    onBoundsChangeRef.current({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLon: b.getWest(),
      maxLon: b.getEast(),
    });
  }, []);

  // Recompute which markers are inside the viewport.
  // Stable (empty deps, reads from refs). Called on map events and when markers change.
  // Does NOT call onBoundsChange — pins arriving from the API never trigger another fetch.
  const emitVisible = useCallback((m: ReturnType<typeof useMap>) => {
    if (!onVisibleMarkerIdsChangeRef.current) return;
    const b = m.getBounds();
    const visibleIds = markersRef.current
      .filter((marker) => b.contains([marker.latitude, marker.longitude]))
      .map((marker) => marker.id);

    const previous = lastVisibleIdsRef.current;
    const isSame =
      previous.length === visibleIds.length &&
      previous.every((markerId, index) => markerId === visibleIds[index]);
    if (isSame) return;

    lastVisibleIdsRef.current = visibleIds;
    onVisibleMarkerIdsChangeRef.current(visibleIds);
  }, []);

  const map = useMapEvents({
    moveend: () => {
      emitBounds(map);
      emitVisible(map);
    },
    zoomend: () => {
      emitBounds(map);
      emitVisible(map);
    },
  });

  // Trigger the initial data fetch once on mount.
  useEffect(() => {
    emitBounds(map);
  }, [map, emitBounds]); // stable deps → runs exactly once

  // When new pins arrive from the API, recompute which are visible in the current viewport.
  // emitVisible is stable, so this only re-runs when `markers` identity changes.
  useEffect(() => {
    emitVisible(map);
  }, [markers, map, emitVisible]);

  return null;
}
