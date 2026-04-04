"use server";

import { formatPlaceLabel, formatAddressLabel } from "@bondery/helpers/address-utils";

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

const DEFAULT_MAPS_URL = "https://api.mapy.com";

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
function buildLabelFromRawItem(raw: any): string {
  const name = String(raw?.name || "").trim();
  if (!name) return "";

  const regional: any[] = Array.isArray(raw?.regionalStructure) ? raw.regionalStructure : [];

  const municipality = regional.find((e: any) => e.type === "regional.municipality");
  const city = municipality?.name ?? null;

  // Take the last (broadest) region entry
  let state: string | null = null;
  for (const entry of regional) {
    if (entry.type === "regional.region" || entry.type === "regional.county") {
      state = entry.name;
    }
  }

  const countryEntry = regional.find((e: any) => e.type === "regional.country");
  const countryCode: string | null = countryEntry?.isoCode ?? null;

  const isAddress = String(raw?.type || "") === "regional.address";
  const isStreet = String(raw?.type || "") === "regional.street";
  const zip: string | null = raw?.zip ? String(raw.zip) : null;

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

function parseItem(raw: any): MapSuggestionItem {
  const position = raw?.position;
  let lat: number | null = null;
  let lon: number | null = null;
  const regionalStructure = Array.isArray(raw?.regionalStructure) ? raw.regionalStructure : [];
  const countryIso = String(
    regionalStructure.find((entry: any) => entry?.type === "regional.country")?.isoCode || "",
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
    const first = Number(position.lon ?? position.lng ?? position.x ?? position.lat);
    const second = Number(position.lat ?? position.y ?? position.lon ?? position.lng);
    const normalized = normalizeCoordinates(first, second, countryIso);
    if (normalized) {
      lat = normalized.lat;
      lon = normalized.lon;
    }
  }

  const displayLabel = buildLabelFromRawItem(raw);

  return {
    label: displayLabel || String(raw?.name || ""),
    name: String(raw?.name || raw?.label || ""),
    type: String(raw?.type || "regional.address"),
    zip: raw?.zip ? String(raw.zip) : null,
    position: {
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    },
    regionalStructure: Array.isArray(raw?.regionalStructure)
      ? raw.regionalStructure.map((entry: any) => ({
          type: entry?.type ? String(entry.type) : undefined,
          name: entry?.name ? String(entry.name) : undefined,
          isoCode: entry?.isoCode ? String(entry.isoCode) : undefined,
        }))
      : [],
  };
}

/**
 * Fetches address/location suggestions from the Mapy.com /v1/suggest API.
 * Runs server-side so the private API key is never exposed to the client.
 *
 * @param query - The search string typed by the user (min 2 chars to trigger).
 * @param mode - "place" returns only city/region results; "address" (default) also includes streets and addresses.
 * @returns Array of parsed suggestion items including label, position, and regional structure.
 */
export async function getMapSuggestions(
  query: string,
  mode: "place" | "address" = "address",
): Promise<MapSuggestionItem[]> {
  const text = query.trim();
  if (text.length < 2) {
    return [];
  }

  // Normalise to bare origin — strip trailing slash and any /v1 path suffix
  // so that NEXT_PUBLIC_MAPS_URL can be either "https://api.mapy.com" or "https://api.mapy.com/v1/"
  const mapsUrl = process.env.NEXT_PUBLIC_MAPS_URL!;
  const mapsKey = process.env.NEXT_PRIVATE_MAPS_KEY;

  if (!mapsKey) {
    return [];
  }

  const upstream = new URL(`${mapsUrl}/v1/suggest`);
  upstream.searchParams.set("apikey", mapsKey);
  upstream.searchParams.set("query", text);
  upstream.searchParams.set("lang", "en");
  upstream.searchParams.set("limit", "8");
  upstream.searchParams.set(
    "type",
    mode === "place"
      ? "regional.municipality"
      : "regional.address,regional.street,regional.municipality",
  );

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const rawResults = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.result)
        ? payload.result
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

    const parsed = (rawResults as any[]).map(parseItem).filter((item) => item.label.length > 0);
    return parsed;
  } catch (err) {
    return [];
  }
}

/**
 * Fetches the IANA timezone identifier for a given coordinate pair
 * from the Mapy.com /v1/timezone/coordinate API.
 * Runs server-side so the private API key is never exposed to the client.
 *
 * @param lat - Latitude of the coordinate (-90 to 90).
 * @param lon - Longitude of the coordinate (-180 to 180).
 * @returns The IANA timezone name (e.g. "Europe/Prague"), or null if unavailable.
 */
export async function getTimezoneForCoordinates(lat: number, lon: number): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const mapsUrl = process.env.NEXT_PUBLIC_MAPS_URL!;
  const mapsKey = process.env.NEXT_PRIVATE_MAPS_KEY;

  if (!mapsKey) {
    return null;
  }

  const upstream = new URL(`${mapsUrl}/v1/timezone/coordinate`);
  upstream.searchParams.set("apikey", mapsKey);
  upstream.searchParams.set("lat", String(lat));
  upstream.searchParams.set("lon", String(lon));
  upstream.searchParams.set("lang", "en");

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const timezoneName = payload?.timezone?.timezoneName;

    return typeof timezoneName === "string" && timezoneName.length > 0 ? timezoneName : null;
  } catch {
    return null;
  }
}
