"use client";

import { detachPromise } from "@bondery/helpers/async";
import { useDebouncedCallback } from "@mantine/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MapCamera } from "@/components/map/PeopleMap";
import {
  type MapSelfLocation,
  readMapGeolocationIfGranted,
} from "@/components/map/useMapGeolocation";
import { routeWithQuery } from "@/lib/navigation/route/query";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { DEFAULT_MAP_CAMERA, GRANTED_LOCATION_ZOOM } from "../utils/mapConstants";
import {
  applyMapCameraToSearchParams,
  isSameMapCameraInSearchParams,
  parseMapCameraSearchParams,
} from "../utils/mapUrlCamera";
import type { MapView } from "../utils/types";

/**
 * Keeps the map camera and the `view` query param in sync with the URL.
 * The URL camera is the source of truth after first paint; GPS is probed only for an empty URL.
 */
export function useMapCamera(view: MapView) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [resolvedCamera, setResolvedCamera] = useState<MapCamera | null>(() =>
    parseMapCameraSearchParams(searchParams),
  );
  const [grantedSelfLocation, setGrantedSelfLocation] = useState<MapSelfLocation | null>(null);

  // Live camera from URL after pan/zoom; hold pin queries until camera is non-null.
  const pinsCamera = parseMapCameraSearchParams(searchParams) ?? resolvedCamera;

  const handleCameraChange = useDebouncedCallback((camera: MapCamera) => {
    if (isSameMapCameraInSearchParams(searchParams, camera)) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    applyMapCameraToSearchParams(params, camera);
    if (!params.has("view")) {
      params.set("view", view);
    }
    router.replace(routeWithQuery(pathname, params));
  }, DEBOUNCE_MS.mapViewport);

  useEffect(() => {
    if (resolvedCamera !== null) {
      return;
    }

    let cancelled = false;

    detachPromise(
      (async () => {
        const location = await readMapGeolocationIfGranted();
        if (cancelled) {
          return;
        }

        const camera: MapCamera = location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              zoom: GRANTED_LOCATION_ZOOM,
            }
          : DEFAULT_MAP_CAMERA;

        if (location) {
          setGrantedSelfLocation(location);
        }
        setResolvedCamera(camera);

        const params = new URLSearchParams(searchParams.toString());
        applyMapCameraToSearchParams(params, camera);
        if (!params.has("view")) {
          params.set("view", view);
        }
        router.replace(routeWithQuery(pathname, params));
      })(),
    );

    return () => {
      cancelled = true;
    };
  }, [pathname, resolvedCamera, router, searchParams, view]);

  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", value);
    router.replace(routeWithQuery(pathname, params));
  };

  return { grantedSelfLocation, handleCameraChange, handleViewChange, pinsCamera, resolvedCamera };
}
