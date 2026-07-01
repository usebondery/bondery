/**
 * Shared Mapy.com suggestion parsing helpers.
 *
 * These functions are used by both the Next.js webapp (server actions) and the
 * Fastify API server (geocode proxy route) to parse raw Mapy.com /v1/suggest
 * responses into typed {@link MapSuggestionItem} objects.
 */

import { formatAddressLabel, formatPlaceLabel } from "./address-utils";

export interface MapSuggestionRegionalEntry {
  type?: string;
  name?: string;
  isoCode?: string;
}

export interface MapSuggestionItem {
  label: string;
  name: string;
  type: string;
  zip: string | null;
  position: {
    lat: number | null;
    lon: number | null;
  };
  regionalStructure: MapSuggestionRegionalEntry[];
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function isWithinCzechiaBounds(lat: number, lon: number): boolean {
  return lat >= 48.4 && lat <= 51.2 && lon >= 12.0 && lon <= 19.0;
}

function normalizeCoordinates(
  first: number,
  second: number,
  countryIso?: string,
): { lat: number; lon: number } | null {
  const candidateLonLat = { lat: second, lon: first };
  const candidateLatLon = { lat: first, lon: second };

  const isLonLatValid = isValidCoordinate(candidateLonLat.lat, candidateLonLat.lon);
  const isLatLonValid = isValidCoordinate(candidateLatLon.lat, candidateLatLon.lon);

  if (!isLonLatValid && !isLatLonValid) {
    return null;
  }

  if (countryIso === "CZ" && isLonLatValid && isLatLonValid) {
    const lonLatInside = isWithinCzechiaBounds(candidateLonLat.lat, candidateLonLat.lon);
    const latLonInside = isWithinCzechiaBounds(candidateLatLon.lat, candidateLatLon.lon);

    if (lonLatInside && !latLonInside) {
      return candidateLonLat;
    }

    if (latLonInside && !lonLatInside) {
      return candidateLatLon;
    }
  }

  if (isLonLatValid) {
    return candidateLonLat;
  }

  if (isLatLonValid) {
    return candidateLatLon;
  }

  return null;
}

/**
 * Extracts structured address fields from a raw Mapy suggest item and
 * produces a display label using the shared formatting helpers.
 */
function buildLabelFromRawItem(raw: unknown): string {
  const item = raw as Record<string, unknown>;
  const name = String(item?.name || "").trim();
  if (!name) return "";

  const regional: unknown[] = Array.isArray(item?.regionalStructure) ? item.regionalStructure : [];

  const municipality = (regional as Array<Record<string, unknown>>).find(
    (e) => e.type === "regional.municipality",
  );
  const city = (municipality?.name as string | undefined) ?? null;

  let state: string | null = null;
  for (const entry of regional as Array<Record<string, unknown>>) {
    if (entry.type === "regional.region" || entry.type === "regional.county") {
      state = (entry.name as string | undefined) ?? state;
    }
  }

  const countryEntry = (regional as Array<Record<string, unknown>>).find(
    (e) => e.type === "regional.country",
  );
  const countryCode: string | null = (countryEntry?.isoCode as string | undefined) ?? null;

  const itemType = String(item?.type || "");
  const isAddress = itemType === "regional.address";
  const isStreet = itemType === "regional.street";
  const zip: string | null = item?.zip ? String(item.zip) : null;

  if (isAddress) {
    return formatAddressLabel({
      addressLine1: name,
      city,
      postalCode: zip,
      state,
      countryCode,
    });
  }

  if (isStreet) {
    return formatAddressLabel({ addressLine1: name, city, countryCode });
  }

  return formatPlaceLabel({ city: city ?? name, state, countryCode });
}

/**
 * Parses a single raw Mapy.com suggest item into a {@link MapSuggestionItem}.
 */
export function parseMapSuggestionItem(raw: unknown): MapSuggestionItem {
  const item = raw as Record<string, unknown>;
  const position = item?.position;
  let lat: number | null = null;
  let lon: number | null = null;
  const regionalStructure = Array.isArray(item?.regionalStructure) ? item.regionalStructure : [];
  const countryIso = String(
    (regionalStructure as Array<Record<string, unknown>>).find(
      (entry) => entry?.type === "regional.country",
    )?.isoCode || "",
  ).toUpperCase();

  if (Array.isArray(position) && position.length >= 2) {
    const first = Number(position[0]);
    const second = Number(position[1]);

    const normalized = normalizeCoordinates(first, second, countryIso);
    if (normalized) {
      lat = normalized.lat;
      lon = normalized.lon;
    }
  } else if (position && typeof position === "object") {
    const pos = position as Record<string, unknown>;
    const first = Number(pos.lon ?? pos.lng ?? pos.x ?? pos.lat);
    const second = Number(pos.lat ?? pos.y ?? pos.lon ?? pos.lng);
    const normalized = normalizeCoordinates(first, second, countryIso);
    if (normalized) {
      lat = normalized.lat;
      lon = normalized.lon;
    }
  }

  const displayLabel = buildLabelFromRawItem(raw);

  return {
    label: displayLabel || String(item?.name || ""),
    name: String(item?.name || item?.label || ""),
    type: String(item?.type || "regional.address"),
    zip: item?.zip ? String(item.zip) : null,
    position: {
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    },
    regionalStructure: Array.isArray(item?.regionalStructure)
      ? (item.regionalStructure as Array<Record<string, unknown>>).map((entry) => ({
          type: entry?.type ? String(entry.type) : undefined,
          name: entry?.name ? String(entry.name) : undefined,
          isoCode: entry?.isoCode ? String(entry.isoCode) : undefined,
        }))
      : [],
  };
}

/**
 * Parses an array of raw Mapy.com suggest items, filtering out empty labels.
 */
export function parseMapSuggestions(rawItems: unknown[]): MapSuggestionItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map(parseMapSuggestionItem).filter((item) => item.label.length > 0);
}
