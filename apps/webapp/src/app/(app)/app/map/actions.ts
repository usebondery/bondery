"use server";

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
 * Builds a human-readable label from the raw Mapy suggest item.
 * The API's own `label` field contains the admin-type description ("Statutory city",
 * "District", etc.) which is not useful as a display string. We compose a richer
 * label from `name` + key entries from `regionalStructure`.
 */
function buildDisplayLabel(raw: any): string {
  const name = String(raw?.name || "").trim();
  if (!name) return "";

  const regional: any[] = Array.isArray(raw?.regionalStructure) ? raw.regionalStructure : [];
  const parts: string[] = [name];

  // For addresses/streets include their parent municipality
  const municipality = regional.find((e) => e.type === "regional.municipality" && e.name !== name);
  if (municipality?.name) parts.push(municipality.name);

  // Add a region only when it adds clarity (avoid duplicating municipality)
  const region = regional.find(
    (e) =>
      (e.type === "regional.region" || e.type === "regional.county") &&
      e.name !== name &&
      e.name !== municipality?.name,
  );
  if (region?.name) parts.push(region.name);

  // Always end with country ISO code when available
  const country = regional.find((e) => e.type === "regional.country");
  if (country?.isoCode) parts.push(country.isoCode);
  else if (country?.name && country.name !== name) parts.push(country.name);

  return parts.join(", ");
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

  const displayLabel = buildDisplayLabel(raw);

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
 * @returns Array of parsed suggestion items including label, position, and regional structure.
 */
export async function getMapSuggestions(query: string): Promise<MapSuggestionItem[]> {
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
    "regional.address,regional.municipality,regional.region,regional.country",
  );

  console.log("[getMapSuggestions] fetching:", upstream.toString());

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[getMapSuggestions] upstream error:", response.status, response.statusText);
      return [];
    }

    const payload = await response.json();
    console.log("[getMapSuggestions] raw server response:", JSON.stringify(payload, null, 2));
    const rawResults = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.result)
        ? payload.result
        : Array.isArray(payload?.results)
          ? payload.results
          : [];

    const parsed = (rawResults as any[]).map(parseItem).filter((item) => item.label.length > 0);
    console.log("[getMapSuggestions] parsed results:", parsed);
    return parsed;
  } catch (err) {
    console.error("[getMapSuggestions] fetch failed:", err);
    return [];
  }
}
