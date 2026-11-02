"use client";

import { useCallback, useState } from "react";

export type MapGeolocationStatus =
  | "idle"
  | "prompting"
  | "ready"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "insecure";

export interface MapSelfLocation {
  latitude: number;
  longitude: number;
}

export type MapGeolocationFailureStatus = Exclude<
  MapGeolocationStatus,
  "idle" | "prompting" | "ready"
>;

export type MapGeolocationResult =
  | { location: MapSelfLocation; ok: true }
  | { ok: false; status: MapGeolocationFailureStatus };

const GEO_TIMEOUT_MS = 10_000;
const GEO_MAXIMUM_AGE_MS = 60_000;

const GEO_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: GEO_MAXIMUM_AGE_MS,
  timeout: GEO_TIMEOUT_MS,
};

function detectInitialStatus(): MapGeolocationStatus {
  if (typeof window === "undefined") {
    return "idle";
  }
  if (!window.isSecureContext) {
    return "insecure";
  }
  if (!navigator.geolocation) {
    return "unsupported";
  }
  return "idle";
}

function mapPositionError(error: GeolocationPositionError): MapGeolocationFailureStatus {
  if (error.code === error.PERMISSION_DENIED) {
    return "denied";
  }
  if (error.code === error.TIMEOUT) {
    return "timeout";
  }
  return "unavailable";
}

function getCurrentMapPosition(geolocation: Geolocation): Promise<MapGeolocationResult> {
  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          ok: true,
        });
      },
      (error) => {
        resolve({ ok: false, status: mapPositionError(error) });
      },
      GEO_POSITION_OPTIONS,
    );
  });
}

/**
 * Read GPS only when the browser already granted geolocation.
 * Does not show a permission prompt. Safari without `permissions.query` is not granted.
 */
export async function readMapGeolocationIfGranted(): Promise<MapSelfLocation | null> {
  const view = globalThis.window;
  if (view === undefined) {
    return null;
  }
  if (!view.isSecureContext) {
    return null;
  }

  const geoNavigator = view.navigator ?? globalThis.navigator;
  if (!geoNavigator?.geolocation) {
    return null;
  }

  const permissionState = await queryGeolocationPermission(geoNavigator);
  if (permissionState !== "granted") {
    return null;
  }

  const result = await getCurrentMapPosition(geoNavigator.geolocation);
  return result.ok ? result.location : null;
}

async function queryGeolocationPermission(
  geoNavigator: Navigator,
): Promise<PermissionState | null> {
  const query = geoNavigator.permissions?.query;
  if (typeof query !== "function") {
    return null;
  }

  try {
    const status = await query.call(geoNavigator.permissions, { name: "geolocation" });
    return status.state;
  } catch {
    return null;
  }
}

/**
 * Click-only geolocation for the map page. Does not watch position, auto-prompt,
 * or persist coordinates.
 */
export function useMapGeolocation() {
  const [status, setStatus] = useState<MapGeolocationStatus>(detectInitialStatus);
  const [selfLocation, setSelfLocation] = useState<MapSelfLocation | null>(null);

  const requestLocation = useCallback((): Promise<MapGeolocationResult> => {
    if (typeof window === "undefined") {
      return Promise.resolve({ ok: false, status: "unavailable" });
    }
    if (!window.isSecureContext) {
      setStatus("insecure");
      return Promise.resolve({ ok: false, status: "insecure" });
    }
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return Promise.resolve({ ok: false, status: "unsupported" });
    }

    setStatus("prompting");

    return getCurrentMapPosition(navigator.geolocation).then((result) => {
      if (result.ok) {
        setSelfLocation(result.location);
        setStatus("ready");
        return result;
      }
      setStatus(result.status);
      return result;
    });
  }, []);

  return {
    isDisabled: status === "insecure" || status === "unsupported",
    isPrompting: status === "prompting",
    requestLocation,
    selfLocation,
    status,
  };
}
