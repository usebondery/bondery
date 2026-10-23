import type { MapPinsBounds } from "@/lib/api/resources/contacts";

/** ~11 m — keeps float noise on the same React Query key. */
const BOUNDS_DECIMALS = 4;

const WEB_MERCATOR_TILE_SIZE = 256;
const DEFAULT_PAD_FRACTION = 0.15;
const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;

/**
 * Canonical pin-fetch viewport height (matches MapClient map height).
 * Slight over-fetch vs a short viewport is OK.
 */
export const MAP_PINS_VIEWPORT_HEIGHT_PX = 560;

/**
 * Canonical pin-fetch viewport width — generous half of the shell grid.
 * Slight over-fetch is OK when the live map is narrower.
 */
export const MAP_PINS_VIEWPORT_WIDTH_PX = 800;

export type MapPinsCamera = {
  latitude: number;
  longitude: number;
  zoom: number;
};

function roundCoord(value: number): number {
  const factor = 10 ** BOUNDS_DECIMALS;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mercatorScale(zoom: number): number {
  return WEB_MERCATOR_TILE_SIZE * 2 ** zoom;
}

function projectLngLat(
  longitude: number,
  latitude: number,
  scale: number,
): { x: number; y: number } {
  const lat = clamp(latitude, MIN_LAT, MAX_LAT);
  const x = ((longitude + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function unprojectPixel(
  x: number,
  y: number,
  scale: number,
): { latitude: number; longitude: number } {
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    latitude: clamp(latitude, MIN_LAT, MAX_LAT),
    longitude: clamp(longitude, MIN_LNG, MAX_LNG),
  };
}

/** Round bbox corners so tiny float differences do not miss the pin cache. */
export function normalizeMapPinsBounds(bounds: MapPinsBounds): MapPinsBounds {
  return {
    maxLat: roundCoord(bounds.maxLat),
    maxLon: roundCoord(bounds.maxLon),
    minLat: roundCoord(bounds.minLat),
    minLon: roundCoord(bounds.minLon),
  };
}

/**
 * Derive an API bbox from a URL camera and a fixed pixel size (Web Mercator).
 * Pads the viewport so edge pins are less likely to flicker out.
 */
export function boundsFromMapCamera(
  camera: MapPinsCamera,
  size: { widthPx: number; heightPx: number },
  padFraction: number = DEFAULT_PAD_FRACTION,
): MapPinsBounds {
  const scale = mercatorScale(camera.zoom);
  const center = projectLngLat(camera.longitude, camera.latitude, scale);
  const pad = 1 + padFraction;
  const halfWidth = (size.widthPx / 2) * pad;
  const halfHeight = (size.heightPx / 2) * pad;

  const northWest = unprojectPixel(center.x - halfWidth, center.y - halfHeight, scale);
  const southEast = unprojectPixel(center.x + halfWidth, center.y + halfHeight, scale);

  return normalizeMapPinsBounds({
    maxLat: Math.max(northWest.latitude, southEast.latitude),
    maxLon: Math.max(northWest.longitude, southEast.longitude),
    minLat: Math.min(northWest.latitude, southEast.latitude),
    minLon: Math.min(northWest.longitude, southEast.longitude),
  });
}
