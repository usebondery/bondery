export interface MapUrlCamera {
  latitude: number;
  longitude: number;
  zoom: number;
}

const LAT_DECIMALS = 5;
const LNG_DECIMALS = 5;
const ZOOM_DECIMALS = 1;

const MIN_LAT = -90;
const MAX_LAT = 90;
const MIN_LNG = -180;
const MAX_LNG = 180;
const MIN_ZOOM = 0;
const MAX_ZOOM = 22;

function parseFiniteNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Parse map camera from URL search params.
 * Returns null when any of latitude/longitude/zoom is missing or not a finite number.
 * Out-of-range values are clamped into valid ranges.
 */
export function parseMapCameraSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParamsLike,
): MapUrlCamera | null {
  const latitude = parseFiniteNumber(searchParams.get("latitude"));
  const longitude = parseFiniteNumber(searchParams.get("longitude"));
  const zoom = parseFiniteNumber(searchParams.get("zoom"));

  if (latitude === null || longitude === null || zoom === null) {
    return null;
  }

  return {
    latitude: clamp(latitude, MIN_LAT, MAX_LAT),
    longitude: clamp(longitude, MIN_LNG, MAX_LNG),
    zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
  };
}

/** Write rounded camera values onto search params (mutates `params`). */
export function applyMapCameraToSearchParams(params: URLSearchParams, camera: MapUrlCamera): void {
  const rounded = serializeMapCamera(camera);
  params.delete("lat");
  params.delete("lng");
  params.delete("z");
  params.set("latitude", rounded.latitude);
  params.set("longitude", rounded.longitude);
  params.set("zoom", rounded.zoom);
}

/** Round camera for URL write comparison and serialization. */
export function serializeMapCamera(camera: MapUrlCamera): {
  latitude: string;
  longitude: string;
  zoom: string;
} {
  const latitude = roundTo(clamp(camera.latitude, MIN_LAT, MAX_LAT), LAT_DECIMALS);
  const longitude = roundTo(clamp(camera.longitude, MIN_LNG, MAX_LNG), LNG_DECIMALS);
  const zoom = roundTo(clamp(camera.zoom, MIN_ZOOM, MAX_ZOOM), ZOOM_DECIMALS);
  return {
    latitude: latitude.toFixed(LAT_DECIMALS),
    longitude: longitude.toFixed(LNG_DECIMALS),
    zoom: zoom.toFixed(ZOOM_DECIMALS),
  };
}

/** True when rounded camera matches the camera already encoded in the query. */
export function isSameMapCameraInSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParamsLike,
  camera: MapUrlCamera,
): boolean {
  const current = parseMapCameraSearchParams(searchParams);
  if (!current) {
    return false;
  }
  const next = serializeMapCamera(camera);
  const existing = serializeMapCamera(current);
  return (
    existing.latitude === next.latitude &&
    existing.longitude === next.longitude &&
    existing.zoom === next.zoom
  );
}

/** Minimal shape shared by `URLSearchParams` and Next `ReadonlyURLSearchParams`. */
interface ReadonlyURLSearchParamsLike {
  get(name: string): string | null;
}
