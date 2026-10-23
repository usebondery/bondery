// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync for React Compiler
"use client";

import { ActionIconButton } from "@bondery/mantine-next";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconCurrentLocation, IconGlobe, IconMap, IconMinus, IconPlus } from "@tabler/icons-react";
import { type MapRef, useMap } from "@vis.gl/react-maplibre";
import { useEffect, useRef, useState } from "react";
import { useMapCommonTranslations } from "@/lib/i18n/generated/hooks";
import { applyMapProjectionVisuals } from "./applyMapProjectionVisuals";
import {
  type MapProjectionPreference,
  persistMapProjectionPreference,
  readMapProjectionPreference,
} from "./mapProjectionPreference";
import type {
  MapBounds,
  MapCamera,
  PeopleMapFocus,
  PeopleMapMarker,
  PeopleMapMyLocationControl,
} from "./PeopleMap";

const FIT_PADDING_PX = 40;
/** Above the map canvas only — keep below Mantine Tooltip portals (~300). */
const MAP_CONTROLS_Z_INDEX = 5;

export function MapZoomControls({
  myLocationControl,
  onProjectionChange,
}: {
  myLocationControl?: PeopleMapMyLocationControl | null;
  onProjectionChange?: (projection: MapProjectionPreference) => void;
}) {
  const { current: map } = useMap();
  const t = useMapCommonTranslations();
  const [currentZoom, setCurrentZoom] = useState(() => map?.getZoom() ?? 0);
  const [projection, setProjection] = useState<MapProjectionPreference>("mercator");
  const onProjectionChangeRef = useRef(onProjectionChange);
  onProjectionChangeRef.current = onProjectionChange;

  useEffect(() => {
    if (!map) {
      return;
    }

    const syncZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    syncZoom();
    map.on("zoomend", syncZoom);
    return () => {
      map.off("zoomend", syncZoom);
    };
  }, [map]);

  useEffect(() => {
    if (!map) {
      return;
    }

    let cancelled = false;
    void readMapProjectionPreference().then((stored) => {
      if (cancelled) {
        return;
      }
      // setProjection/setSky are omitted from MapRef; use the MapLibre map.
      applyMapProjectionVisuals(map.getMap(), stored);
      setProjection(stored);
      onProjectionChangeRef.current?.(stored);
    });

    return () => {
      cancelled = true;
    };
  }, [map]);

  if (!map) {
    return null;
  }

  const minZoom = map.getMinZoom();
  const maxZoom = map.getMaxZoom();
  // Disabled controls do not fire pointer events. Prefer aria-disabled so Tooltip
  // can wrap ActionIcon (ref-forwarding) without a <span> that breaks Group radius.
  const myLocationNeedsDisabledTooltip = Boolean(
    myLocationControl?.disabled && myLocationControl.disabledTooltip,
  );
  const projectionLabel = projection === "mercator" ? t("ShowGlobe") : t("ShowFlatMap");

  return (
    <ActionIcon.Group
      aria-label={t("ZoomControls")}
      orientation="vertical"
      style={{
        left: 12,
        pointerEvents: "auto",
        position: "absolute",
        top: 12,
        zIndex: MAP_CONTROLS_Z_INDEX,
      }}
    >
      <Tooltip label={projectionLabel}>
        <ActionIcon
          aria-label={projectionLabel}
          onClick={() => {
            const next: MapProjectionPreference = projection === "mercator" ? "globe" : "mercator";
            applyMapProjectionVisuals(map.getMap(), next);
            setProjection(next);
            onProjectionChangeRef.current?.(next);
            void persistMapProjectionPreference(next).catch(() => {});
          }}
          size="lg"
          variant="default"
        >
          {projection === "mercator" ? (
            <IconGlobe size={20} stroke={1.5} />
          ) : (
            <IconMap size={20} stroke={1.5} />
          )}
        </ActionIcon>
      </Tooltip>
      <ActionIconButton
        aria-label={t("ZoomIn")}
        disabled={currentZoom >= maxZoom}
        icon={<IconPlus />}
        onClick={() => map.zoomIn()}
        size="lg"
        variant="default"
      />
      <ActionIconButton
        aria-label={t("ZoomOut")}
        disabled={currentZoom <= minZoom}
        icon={<IconMinus />}
        onClick={() => map.zoomOut()}
        size="lg"
        variant="default"
      />
      {myLocationControl ? (
        <Tooltip
          disabled={!myLocationNeedsDisabledTooltip}
          label={myLocationControl.disabledTooltip ?? ""}
        >
          <ActionIcon
            aria-disabled={myLocationNeedsDisabledTooltip || undefined}
            aria-label={myLocationControl.ariaLabel}
            disabled={myLocationControl.disabled && !myLocationNeedsDisabledTooltip}
            loading={myLocationControl.loading}
            onClick={() => {
              if (myLocationControl.disabled) {
                return;
              }
              myLocationControl.onClick();
            }}
            size="lg"
            style={
              myLocationNeedsDisabledTooltip
                ? { cursor: "not-allowed", opacity: "var(--mantine-opacity-disabled, 0.5)" }
                : undefined
            }
            variant="default"
          >
            <IconCurrentLocation size={20} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      ) : null}
    </ActionIcon.Group>
  );
}

export function MapFocusController({
  focus,
  defaultZoom,
}: {
  defaultZoom: number;
  focus?: PeopleMapFocus | null;
}) {
  const { current: map } = useMap();
  const focusToken = focus?.token;

  useEffect(() => {
    if (!map || !focus || !focusToken) {
      return;
    }

    map.flyTo({
      center: [focus.longitude, focus.latitude],
      zoom: focus.zoom ?? defaultZoom,
    });
  }, [defaultZoom, focus, focusToken, map]);

  return null;
}

/**
 * Re-centers the map whenever the set of markers changes (e.g. after an address
 * is added or updated). Skips the very first render so Map's initial
 * view state handles the page-load position.
 */
export function FitMarkersController({
  markers,
  defaultZoom,
  disabled = false,
}: {
  defaultZoom: number;
  disabled?: boolean;
  markers: PeopleMapMarker[];
}) {
  const { current: map } = useMap();
  const prevKeyRef = useRef("");

  useEffect(() => {
    if (!map || disabled) {
      return;
    }

    const key = markers.map((m) => `${m.latitude}:${m.longitude}`).join("|");

    if (prevKeyRef.current === key) {
      return;
    }

    const isFirstLoad = prevKeyRef.current === "";
    prevKeyRef.current = key;

    const fitMarkers = markers.filter(
      (marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude),
    );

    if (isFirstLoad || fitMarkers.length === 0) {
      return;
    }

    if (fitMarkers.length === 1) {
      const only = fitMarkers[0];
      map.flyTo({
        center: [only.longitude, only.latitude],
        zoom: defaultZoom,
      });
      return;
    }

    let minLng = Number.POSITIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    for (const marker of fitMarkers) {
      minLng = Math.min(minLng, marker.longitude);
      minLat = Math.min(minLat, marker.latitude);
      maxLng = Math.max(maxLng, marker.longitude);
      maxLat = Math.max(maxLat, marker.latitude);
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: FIT_PADDING_PX },
    );
  }, [defaultZoom, map, markers, disabled]);

  return null;
}

export function VisibleMarkersController({
  markers,
  onVisibleMarkerIdsChange,
  onBoundsChange,
  onCameraChange,
}: {
  markers: PeopleMapMarker[];
  onBoundsChange?: (bounds: MapBounds) => void;
  onCameraChange?: (camera: MapCamera) => void;
  onVisibleMarkerIdsChange?: (markerIds: string[]) => void;
}) {
  const { current: map } = useMap();
  const lastVisibleIdsRef = useRef<string[]>([]);

  // Keep refs up to date so stable callbacks always see the latest values
  // without adding them to effect dependency arrays (which would cause re-runs).
  const markersRef = useRef(markers);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onCameraChangeRef = useRef(onCameraChange);
  const onVisibleMarkerIdsChangeRef = useRef(onVisibleMarkerIdsChange);
  markersRef.current = markers;
  onBoundsChangeRef.current = onBoundsChange;
  onCameraChangeRef.current = onCameraChange;
  onVisibleMarkerIdsChangeRef.current = onVisibleMarkerIdsChange;

  useEffect(() => {
    if (!map) {
      return;
    }

    const emitBounds = (m: MapRef) => {
      if (!onBoundsChangeRef.current) {
        return;
      }
      const b = m.getBounds();
      if (!b || b.isEmpty()) {
        return;
      }
      onBoundsChangeRef.current({
        maxLat: b.getNorth(),
        maxLon: b.getEast(),
        minLat: b.getSouth(),
        minLon: b.getWest(),
      });
    };

    const emitCamera = (m: MapRef) => {
      if (!onCameraChangeRef.current) {
        return;
      }
      const center = m.getCenter();
      onCameraChangeRef.current({
        latitude: center.lat,
        longitude: center.lng,
        zoom: m.getZoom(),
      });
    };

    const emitVisible = (m: MapRef) => {
      if (!onVisibleMarkerIdsChangeRef.current) {
        return;
      }
      const b = m.getBounds();
      if (!b || b.isEmpty()) {
        return;
      }
      const visibleIds = markersRef.current
        .filter((marker) => {
          if (!Number.isFinite(marker.latitude) || !Number.isFinite(marker.longitude)) {
            return false;
          }
          try {
            return b.contains([marker.longitude, marker.latitude]);
          } catch {
            return false;
          }
        })
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
    };

    const onViewChange = () => {
      emitBounds(map);
      emitCamera(map);
      emitVisible(map);
    };

    const onLoad = () => {
      emitBounds(map);
      emitCamera(map);
      emitVisible(map);
    };

    map.on("moveend", onViewChange);
    map.on("zoomend", onViewChange);

    if (map.isStyleLoaded()) {
      onLoad();
    } else {
      map.once("load", onLoad);
    }

    return () => {
      map.off("load", onLoad);
      map.off("moveend", onViewChange);
      map.off("zoomend", onViewChange);
    };
  }, [map]);

  // When new pins arrive from the API, recompute which are visible in the current viewport.
  // Bounds must NOT re-fire here. `markers` is intentional even though the body reads markersRef.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when markers identity changes
  useEffect(() => {
    if (!map) {
      return;
    }

    if (!onVisibleMarkerIdsChangeRef.current) {
      return;
    }

    const b = map.getBounds();
    if (!b || b.isEmpty()) {
      return;
    }

    const visibleIds = markersRef.current
      .filter((marker) => {
        if (!Number.isFinite(marker.latitude) || !Number.isFinite(marker.longitude)) {
          return false;
        }
        try {
          return b.contains([marker.longitude, marker.latitude]);
        } catch {
          return false;
        }
      })
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
  }, [map, markers]);

  return null;
}
