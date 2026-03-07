/**
 * Mapy.com API helpers for geocoding and timezone lookup.
 *
 * Used to enrich LinkedIn-scraped location strings (e.g. "Prague, Czechia")
 * with coordinates, structured address fields, and IANA timezone identifiers.
 */

import { createAdminClient } from "./supabase.js";
import { formatPlaceLabel } from "@bondery/helpers/address-utils";

const MAPS_BASE_URL = "https://api.mapy.com";

/** Cache entries older than this are refreshed from the upstream API. */
const GEOCODE_CACHE_TTL_DAYS = 180;

/** Read at call time — env is populated by @fastify/env after module load. */
function getMapsKey(): string {
  return process.env.MAPS_KEY || "";
}

function getMapsUrl(): string {
  return process.env.MAPS_URL || MAPS_BASE_URL;
}

/** Structured result from geocoding a LinkedIn place string. */
export interface GeocodeResult {
  /** PostGIS EWKT string for direct insert/update of the `location` geography column. */
  locationEwkt: string;
  /** Latitude — used for subsequent timezone lookup, NOT for DB insert (generated column). */
  lat: number;
  /** Longitude — used for subsequent timezone lookup, NOT for DB insert (generated column). */
  lon: number;
  name: string;
  city: string | null;
  state: string | null;
  stateCode: string | null;
  country: string | null;
  countryCode: string | null;
  formattedLabel: string | null;
}

/**
 * Parses a LinkedIn location string into a query and optional locality (country)
 * for the mapy.com geocode API.
 *
 * LinkedIn places can be:
 *   - "Prague, Czechia"                → query = "Prague",  locality = "Czechia"
 *   - "Brno, South Moravia, Czechia"   → query = "Brno",    locality = "Czechia"
 *   - "Czechia"                        → query = "Czechia",  locality = undefined
 *   - "San Francisco Bay Area"         → query = "San Francisco Bay Area", locality = undefined
 *
 * For 3-part strings the middle segment (region) is intentionally dropped from the
 * query so the API resolves the *city*, not the region.
 *
 * @param place - Raw location string from LinkedIn.
 * @returns An object with `query` and optional `locality`.
 */
function parseLinkedInPlace(place: string): { query: string; locality?: string } {
  const trimmed = place.trim();
  const parts = trimmed
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return { query: trimmed };
  }

  if (parts.length === 1) {
    // No comma — could be just a country name or a single city
    return { query: parts[0] };
  }

  // 2-part ("City, Country") or 3+-part ("City, Region, Country"):
  // Always use the first segment as query and the last as locality.
  return { query: parts[0], locality: parts[parts.length - 1] };
}

/**
 * Geocodes a LinkedIn-scraped location string using the Mapy.com /v1/geocode API.
 *
 * Splits the place into city + country, sends a regional geocode request with
 * limit=1, and parses the first result's position and regional structure into
 * a structured GeocodeResult.
 *
 * Returns null when:
 *  - `place` is empty
 *  - `MAPS_KEY` is not configured
 *  - the API returns no results or an error
 *
 * @param place - Raw location string from LinkedIn (e.g. "Brno, Czechia" or "Czechia").
 * @returns Structured geocode result, or null on failure.
 */
export async function geocodeLinkedInPlace(place: string): Promise<GeocodeResult | null> {
  const trimmed = place.trim();
  const mapsKey = getMapsKey();
  const mapsUrl = getMapsUrl();

  if (!trimmed || !mapsKey) {
    if (!mapsKey) console.warn("[mapy] MAPS_KEY is not configured, skipping geocode");
    return null;
  }

  const { query, locality } = parseLinkedInPlace(trimmed);

  const upstream = new URL(`${mapsUrl}/v1/geocode`);
  upstream.searchParams.set("apikey", mapsKey);
  upstream.searchParams.set("query", query);
  upstream.searchParams.set("lang", "en");
  upstream.searchParams.set("limit", "1");
  upstream.searchParams.set("type", "regional");

  if (locality) {
    upstream.searchParams.set("locality", locality);
  }

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(`[mapy] Geocode failed with status ${response.status} for "${trimmed}"`);
      return null;
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];

    if (items.length === 0) {
      return null;
    }

    const item = items[0];
    const position = item.position;

    if (!position || typeof position.lat !== "number" || typeof position.lon !== "number") {
      return null;
    }

    // Extract structured address from regionalStructure
    const regional: Array<{ name: string; type: string; isoCode?: string }> = Array.isArray(
      item.regionalStructure,
    )
      ? item.regionalStructure
      : [];

    let city: string | null = null;
    let state: string | null = null;
    let stateCode: string | null = null;
    let country: string | null = null;
    let countryCode: string | null = null;

    for (const entry of regional) {
      if (entry.type === "regional.municipality" || entry.type === "regional.municipality_part") {
        if (!city) city = entry.name;
      } else if (entry.type === "regional.region") {
        // The API may return multiple regions (e.g. "Brno-City District" then
        // "South Moravian Region"). Always keep the last (broadest) one.
        state = entry.name;
      } else if (entry.type === "regional.country") {
        country = entry.name;
        countryCode = entry.isoCode ?? null;
      }
    }

    return {
      locationEwkt: `SRID=4326;POINT(${position.lon} ${position.lat})`,
      lat: position.lat,
      lon: position.lon,
      name: item.name ?? query,
      city,
      state,
      stateCode,
      country,
      countryCode,
      formattedLabel: formatPlaceLabel({ city, state, countryCode }),
    };
  } catch (err) {
    console.error(`[mapy] Geocode error for "${trimmed}":`, err);
    return null;
  }
}

/**
 * Fetches the IANA timezone identifier for a given coordinate pair from the
 * Mapy.com /v1/timezone/coordinate API.
 *
 * @param lat - Latitude (-90 to 90).
 * @param lon - Longitude (-180 to 180).
 * @returns IANA timezone name (e.g. "Europe/Prague"), or null on failure.
 */
export async function getTimezoneForCoordinates(lat: number, lon: number): Promise<string | null> {
  const mapsKey = getMapsKey();
  const mapsUrl = getMapsUrl();

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !mapsKey) {
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
    });

    if (!response.ok) {
      console.error(`[mapy] Timezone lookup failed with status ${response.status}`);
      return null;
    }

    const payload = await response.json();
    const timezoneName = payload?.timezone?.timezoneName;

    return typeof timezoneName === "string" && timezoneName.length > 0 ? timezoneName : null;
  } catch (err) {
    console.error("[mapy] Timezone lookup error:", err);
    return null;
  }
}

/** Combined geocode + timezone result returned by the cached helper. */
export interface CachedGeocodeResult {
  geo: GeocodeResult;
  timezone: string | null;
}

/**
 * Geocodes a LinkedIn place string with a shared database cache.
 *
 * Lookup flow:
 *  1. Normalise `place` → `place_key` (lowercased, trimmed).
 *  2. Check `geocode_cache` for a non-stale row (updated within the last
 *     {@link GEOCODE_CACHE_TTL_DAYS} days).
 *  3. On cache **hit** with `geocode_found = true` → return cached geo + timezone.
 *  4. On cache **hit** with `geocode_found = false` → return `null` (negative cache).
 *  5. On cache **miss** or stale → call `geocodeLinkedInPlace()` + optionally
 *     `getTimezoneForCoordinates()`, upsert the result, and return it.
 *
 * Uses an admin Supabase client internally so the public `geocode_cache` table
 * (service-role only RLS) is accessible regardless of the calling user's session.
 *
 * @param place - Raw location string from LinkedIn (e.g. "Brno, Czechia").
 * @returns Combined geocode result with timezone, or `null` when geocoding yields no result.
 */
export async function cachedGeocodeLinkedInPlace(
  place: string,
): Promise<CachedGeocodeResult | null> {
  const placeKey = place.trim().toLowerCase();
  if (!placeKey) return null;

  const admin = createAdminClient();

  // ── 1. Cache lookup ────────────────────────────────────────────────────
  try {
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - GEOCODE_CACHE_TTL_DAYS);

    const { data: cached } = await admin
      .from("geocode_cache")
      .select("*")
      .eq("place_key", placeKey)
      .gte("updated_at", staleThreshold.toISOString())
      .maybeSingle();

    if (cached) {
      if (!cached.geocode_found) {
        // Negative cache — the place was previously looked up with no result
        return null;
      }

      return {
        geo: {
          locationEwkt: cached.location_ewkt!,
          lat: cached.lat!,
          lon: cached.lon!,
          name: cached.name ?? placeKey,
          city: cached.city ?? null,
          state: cached.state ?? null,
          stateCode: cached.state_code ?? null,
          country: cached.country ?? null,
          countryCode: cached.country_code ?? null,
          formattedLabel:
            formatPlaceLabel({
              city: cached.city,
              state: cached.state,
              countryCode: cached.country_code,
            }) || null,
        },
        timezone: cached.timezone ?? null,
      };
    }
  } catch (err) {
    // Cache read failed — fall through to live geocode
    console.error("[mapy] Cache read failed, falling through to live geocode:", err);
  }

  // ── 2. Live geocode + timezone ─────────────────────────────────────────
  const geo = await geocodeLinkedInPlace(place);
  let timezone: string | null = null;

  if (geo) {
    timezone = await getTimezoneForCoordinates(geo.lat, geo.lon);
  }

  // ── 3. Upsert into cache ──────────────────────────────────────────────
  try {
    if (geo) {
      await admin.from("geocode_cache").upsert(
        {
          place_key: placeKey,
          place_original: place.trim(),
          geocode_found: true,
          lat: geo.lat,
          lon: geo.lon,
          location_ewkt: geo.locationEwkt,
          name: geo.name,
          city: geo.city,
          state: geo.state,
          state_code: geo.stateCode,
          country: geo.country,
          country_code: geo.countryCode,
          formatted_label: geo.formattedLabel,
          timezone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "place_key" },
      );
    } else {
      // Negative cache — remember that this place yields no result
      await admin.from("geocode_cache").upsert(
        {
          place_key: placeKey,
          place_original: place.trim(),
          geocode_found: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "place_key" },
      );
    }
  } catch (err) {
    // Cache write failure is non-fatal — log and return the live result
    console.error("[mapy] Cache upsert failed:", err);
  }

  if (!geo) return null;

  return { geo, timezone };
}
