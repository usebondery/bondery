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

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: MapSelfLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setSelfLocation(location);
          setStatus("ready");
          resolve({ location, ok: true });
        },
        (error) => {
          const failureStatus = mapPositionError(error);
          setStatus(failureStatus);
          resolve({ ok: false, status: failureStatus });
        },
        {
          enableHighAccuracy: false,
          maximumAge: GEO_MAXIMUM_AGE_MS,
          timeout: GEO_TIMEOUT_MS,
        },
      );
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
