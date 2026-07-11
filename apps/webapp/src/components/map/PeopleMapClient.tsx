"use client";

import { bonderyTheme, PersonChip } from "@bondery/mantine-next";
import { ActionIcon, Avatar, MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import type { MarkerCluster } from "leaflet";
import { DivIcon } from "leaflet";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AttributionControl,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "maplibre-gl/dist/maplibre-gl.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import type { MapBounds, PeopleMapFocus, PeopleMapMarker } from "./PeopleMap";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface PeopleMapClientProps {
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
          cssVariablesResolver={v8CssVariablesResolver}
          defaultColorScheme="auto"
          theme={bonderyTheme}
        >
          <div style={{ transform: "translate(-6px, -8px)" }}>
            <PersonChip
              badgeVariant="filled"
              isClickable={!disableChipNavigation}
              person={{
                avatar: marker.avatarUrl || null,
                firstName,
                id: marker.id,
                lastName,
              }}
              size="sm"
            />
          </div>
        </MantineProvider>,
      );

      map.set(
        marker.id,
        new DivIcon({
          className: "person-map-avatar-icon",
          html: avatarHtml,
          iconAnchor: [28, 34],
          iconSize: [160, 38],
        }),
      );
    }

    return map;
  }, [disableChipNavigation, markers]);

  return (
    <div
      style={{ borderRadius: "12px", height, overflow: "hidden", position: "relative", zIndex: 0 }}
    >
      <MapContainer
        attributionControl={false}
        center={defaultCenter}
        maxBounds={[
          [-85.051129, -100000],
          [85.051129, 100000],
        ]}
        maxBoundsViscosity={0.9}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: "100%", width: "100%" }}
        worldCopyJump
        zoom={zoom}
        zoomControl={false}
      >
        <AttributionControl prefix={false} />
        <MapZoomControls />
        <MapFocusController defaultZoom={zoom} focus={focus} />
        <FitMarkersController defaultZoom={zoom} disabled={disableAutoFit} markers={markers} />
        <VisibleMarkersController
          markers={markers}
          onBoundsChange={onBoundsChange}
          onVisibleMarkerIdsChange={onVisibleMarkerIdsChange}
        />
        <TileLayer
          attribution={OSM_ATTRIBUTION}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={(cluster: MarkerCluster) => {
            const clusterHtml = renderToStaticMarkup(
              <MantineProvider
                cssVariablesResolver={v8CssVariablesResolver}
                defaultColorScheme="auto"
                theme={bonderyTheme}
              >
                <div style={{ opacity: 1 }}>
                  <Avatar
                    color="blue"
                    name={String(cluster.getChildCount())}
                    radius="xl"
                    size={38}
                    variant="filled"
                  />
                </div>
              </MantineProvider>,
            );

            return new DivIcon({
              className: "person-map-cluster-icon",
              html: clusterHtml,
              iconAnchor: [19, 19],
              iconSize: [38, 38],
            });
          }}
          maxClusterRadius={50}
        >
          {markers.map((marker) => (
            <Marker
              eventHandlers={
                marker.href
                  ? {
                      click: () => {
                        router.push(marker.href as string);
                      },
                    }
                  : undefined
              }
              icon={iconById.get(marker.id)}
              key={`${marker.id}-${marker.latitude}-${marker.longitude}`}
              position={[marker.latitude, marker.longitude]}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

function MapZoomControls() {
  const map = useMap();
  const t = useWebTranslations("MapCommon");
  const [currentZoom, setCurrentZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => {
      setCurrentZoom(map.getZoom());
    },
  });

  const minZoom = map.getMinZoom();
  const maxZoom = map.getMaxZoom();

  return (
    <ActionIcon.Group
      aria-label={t("ZoomControls")}
      orientation="vertical"
      style={{
        left: 12,
        pointerEvents: "auto",
        position: "absolute",
        top: 12,
        zIndex: 1000,
      }}
    >
      <ActionIcon
        aria-label={t("ZoomIn")}
        disabled={currentZoom >= maxZoom}
        onClick={() => map.zoomIn()}
        size="lg"
        variant="default"
      >
        <IconPlus size={20} />
      </ActionIcon>
      <ActionIcon
        aria-label={t("ZoomOut")}
        disabled={currentZoom <= minZoom}
        onClick={() => map.zoomOut()}
        size="lg"
        variant="default"
      >
        <IconMinus size={20} />
      </ActionIcon>
    </ActionIcon.Group>
  );
}

interface MapFocusControllerProps {
  defaultZoom: number;
  focus?: PeopleMapFocus | null;
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
  defaultZoom: number;
  disabled?: boolean;
  markers: PeopleMapMarker[];
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
    if (disabled) {
      return;
    }

    const key = markers.map((m) => `${m.latitude}:${m.longitude}`).join("|");

    if (prevKeyRef.current === key) {
      return;
    }

    const isFirstLoad = prevKeyRef.current === "";
    prevKeyRef.current = key;

    if (isFirstLoad || markers.length === 0) {
      return;
    }

    if (markers.length === 1) {
      map.flyTo([markers[0].latitude, markers[0].longitude], defaultZoom, { animate: true });
    } else {
      map.fitBounds(
        markers.map((m) => [m.latitude, m.longitude] as [number, number]),
        { animate: true, padding: [40, 40] },
      );
    }
  }, [defaultZoom, map, markers, disabled]);

  return null;
}

interface VisibleMarkersControllerProps {
  markers: PeopleMapMarker[];
  onBoundsChange?: (bounds: MapBounds) => void;
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
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
    if (!onBoundsChangeRef.current) {
      return;
    }
    const b = m.getBounds();
    onBoundsChangeRef.current({
      maxLat: b.getNorth(),
      maxLon: b.getEast(),
      minLat: b.getSouth(),
      minLon: b.getWest(),
    });
  }, []);

  // Recompute which markers are inside the viewport.
  // Stable (empty deps, reads from refs). Called on map events and when markers change.
  // Does NOT call onBoundsChange — pins arriving from the API never trigger another fetch.
  const emitVisible = useCallback((m: ReturnType<typeof useMap>) => {
    if (!onVisibleMarkerIdsChangeRef.current) {
      return;
    }
    const b = m.getBounds();
    const visibleIds = markersRef.current
      .filter((marker) => b.contains([marker.latitude, marker.longitude]))
      .map((marker) => marker.id);

    const previous = lastVisibleIdsRef.current;
    const isSame =
      previous.length === visibleIds.length &&
      previous.every((markerId, index) => markerId === visibleIds[index]);
    if (isSame) {
      return;
    }

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
  }, [map, emitVisible]);

  return null;
}
