/**
 * Shared Mapy.com suggestion parsing helpers.
 *
 * These functions are used by both the Next.js webapp (server actions) and the
 * Fastify API server (geocode proxy route) to parse raw Mapy.com /v1/suggest
 * responses into typed {@link MapSuggestionItem} objects.
 */

import { formatAddressLabel, formatPlaceLabel } from "#address/address-utils.js";

interface MapSuggestionRegionalEntry {
  isoCode?: string;
  name?: string;
  type?: string;
}

interface MapSuggestionItem {
  label: string;
  name: string;
  position: {
    lat: number | null;
    lon: number | null;
  };
  regionalStructure: MapSuggestionRegionalEntry[];
  type: string;
  zip: string | null;
}

type RawRegionalEntry = {
  isoCode?: unknown;
  name?: unknown;
  type?: unknown;
};

type RawPositionObject = {
  lat?: unknown;
  lng?: unknown;
  lon?: unknown;
  x?: unknown;
  y?: unknown;
};

type RawMapySuggestItem = {
  label?: unknown;
  name?: unknown;
  position?: unknown;
  regionalStructure?: unknown;
  type?: unknown;
  zip?: unknown;
};

function toRawMapySuggestItem(raw: unknown): RawMapySuggestItem | null {
  if (raw === null || raw === undefined || typeof raw !== "object") {
    return null;
  }
  return raw as RawMapySuggestItem;
}

function toRawRegionalEntries(value: unknown): Array<RawRegionalEntry | null | undefined> {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: Array<RawRegionalEntry | null | undefined> = [];
  for (const entry of value) {
    if (entry === null || entry === undefined) {
      entries.push(entry);
      continue;
    }
    if (typeof entry !== "object") {
      entries.push(undefined);
      continue;
    }
    entries.push(entry as RawRegionalEntry);
  }
  return entries;
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

const CZECHIA_MIN_LATITUDE = 48.4;
const CZECHIA_MAX_LATITUDE = 51.2;
const CZECHIA_MIN_LONGITUDE = 12;
const CZECHIA_MAX_LONGITUDE = 19;

function isWithinCzechiaBounds(lat: number, lon: number): boolean {
  return (
    lat >= CZECHIA_MIN_LATITUDE &&
    lat <= CZECHIA_MAX_LATITUDE &&
    lon >= CZECHIA_MIN_LONGITUDE &&
    lon <= CZECHIA_MAX_LONGITUDE
  );
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
  const item = toRawMapySuggestItem(raw);
  const name = String(item?.name || "").trim();
  if (!name) {
    return "";
  }

  const regional = toRawRegionalEntries(item?.regionalStructure);

  const municipality = regional.find((entry) => entry?.type === "regional.municipality");
  const city = (municipality?.name as string | undefined) ?? null;

  let state: string | null = null;
  for (const entry of regional) {
    if (entry?.type === "regional.region" || entry?.type === "regional.county") {
      state = (entry.name as string | undefined) ?? state;
    }
  }

  const countryEntry = regional.find((entry) => entry?.type === "regional.country");
  const countryCode: string | null = (countryEntry?.isoCode as string | undefined) ?? null;

  const itemType = String(item?.type || "");
  const isAddress = itemType === "regional.address";
  const isStreet = itemType === "regional.street";
  const zip: string | null = item?.zip ? String(item.zip) : null;

  if (isAddress) {
    return formatAddressLabel({
      addressLine1: name,
      city,
      countryCode,
      postalCode: zip,
      state,
    });
  }

  if (isStreet) {
    return formatAddressLabel({ addressLine1: name, city, countryCode });
  }

  return formatPlaceLabel({ city: city ?? name, countryCode, state });
}

/**
 * Parses a single raw Mapy.com suggest item into a {@link MapSuggestionItem}.
 */
function parseMapSuggestionItem(raw: unknown): MapSuggestionItem {
  const item = toRawMapySuggestItem(raw);
  const position = item?.position;
  let lat: number | null = null;
  let lon: number | null = null;
  const regionalStructure = toRawRegionalEntries(item?.regionalStructure);
  const countryIso = String(
    regionalStructure.find((entry) => entry?.type === "regional.country")?.isoCode || "",
  ).toUpperCase();

  if (Array.isArray(position) && position.length >= 2) {
    const first = Number(position[0]);
    const second = Number(position[1]);

    const normalized = normalizeCoordinates(first, second, countryIso);
    if (normalized) {
      ({ lat, lon } = normalized);
    }
  } else if (position && typeof position === "object") {
    const pos = position as RawPositionObject;
    const first = Number(pos.lon ?? pos.lng ?? pos.x ?? pos.lat);
    const second = Number(pos.lat ?? pos.y ?? pos.lon ?? pos.lng);
    const normalized = normalizeCoordinates(first, second, countryIso);
    if (normalized) {
      ({ lat, lon } = normalized);
    }
  }

  const displayLabel = buildLabelFromRawItem(raw);

  return {
    label: displayLabel || String(item?.name || ""),
    name: String(item?.name || item?.label || ""),
    position: {
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    },
    regionalStructure: regionalStructure.map((entry) => ({
      isoCode: entry?.isoCode ? String(entry.isoCode) : undefined,
      name: entry?.name ? String(entry.name) : undefined,
      type: entry?.type ? String(entry.type) : undefined,
    })),
    type: String(item?.type || "regional.address"),
    zip: item?.zip ? String(item.zip) : null,
  };
}

/**
 * Parses an array of raw Mapy.com suggest items, filtering out empty labels.
 */
function parseMapSuggestions(rawItems: unknown[]): MapSuggestionItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }
  return rawItems.map(parseMapSuggestionItem).filter((item) => item.label.length > 0);
}

export type { MapSuggestionItem, MapSuggestionRegionalEntry };
export { parseMapSuggestionItem, parseMapSuggestions };
