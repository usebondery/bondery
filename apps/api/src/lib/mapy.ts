/**
 * Mapy.com API helpers for geocoding and timezone lookup.
 *
 * Used to enrich LinkedIn-scraped location strings (e.g. "Prague, Czechia")
 * with coordinates, structured address fields, and IANA timezone identifiers.
 */

import { createAdminClient } from "./supabase.js";
import { formatPlaceLabel } from "@bondery/helpers/address-utils";
import logger from "./logger.js";

const MAPS_BASE_URL = "https://api.mapy.com";

/** Cache entries older than this are refreshed from the upstream API. */
const GEOCODE_CACHE_TTL_DAYS = 180;

/** Read at call time — env is populated by @fastify/env after module load. */
function getMapsKey(): string {
  return process.env.NEXT_PRIVATE_MAPS_KEY || "";
}

function getMapsUrl(): string {
  return process.env.NEXT_PUBLIC_MAPS_URL || MAPS_BASE_URL;
}

/** Structured result from geocoding a LinkedIn location string. */
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
  postalCode: string | null;
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
 * @param location - Raw location string from LinkedIn.
 * @returns An object with `query` and optional `locality`.
 */
function parseLinkedInLocation(location: string): { query: string; locality?: string } {
  const trimmed = location.trim();
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
 * Splits the location into city + country, sends a regional geocode request with
 * limit=1, and parses the first result's position and regional structure into
 * a structured GeocodeResult.
 *
 * Returns null when:
 *  - `location` is empty
 *  - `NEXT_PRIVATE_MAPS_KEY` is not configured
 *  - the API returns no results or an error
 *
 * @param location - Raw location string from LinkedIn (e.g. "Brno, Czechia" or "Czechia").
 * @returns Structured geocode result, or null on failure.
 */
export async function geocodeLinkedInLocation(location: string): Promise<GeocodeResult | null> {
  const trimmed = location.trim();
  const mapsKey = getMapsKey();
  const mapsUrl = getMapsUrl();

  if (!trimmed || !mapsKey) {
    if (!mapsKey) logger.warn("[mapy] NEXT_PRIVATE_MAPS_KEY is not configured, skipping geocode");
    return null;
  }

  const { query, locality } = parseLinkedInLocation(trimmed);

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
      logger.error({ status: response.status, location: trimmed }, "[mapy] Geocode failed");
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
      postalCode: typeof item.zip === "string" && item.zip.length > 0 ? item.zip : null,
      formattedLabel: formatPlaceLabel({ city, state, countryCode }),
    };
  } catch (err) {
    logger.error({ err, location: trimmed }, "[mapy] Geocode error");
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
      logger.error({ status: response.status }, "[mapy] Timezone lookup failed");
      return null;
    }

    const payload = await response.json();
    const timezoneName = payload?.timezone?.timezoneName;

    return typeof timezoneName === "string" && timezoneName.length > 0 ? timezoneName : null;
  } catch (err) {
    logger.error({ err }, "[mapy] Timezone lookup error");
    return null;
  }
}

/**
 * Validates a street-level address by geocoding without the `type: "regional"` filter.
 *
 * Unlike `geocodeLinkedInPlace` (which only matches cities/regions), this function
 * searches across all result types (streets, addresses, POIs, regions). If the API
 * returns only a regional/city-level match for a query that includes a street name,
 * the street is considered non-existent.
 *
 * @param query - Full address string (e.g. "Panská 11, Mostkovice, Czechia").
 * @param expectedCity - The city to validate the result against (case-insensitive).
 * @returns The geocode result if the address is valid at street level, or `null` if
 *          the street/address was not found.
 */
export async function validateStreetAddress(
  query: string,
  expectedCity: string,
): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  const mapsKey = getMapsKey();
  const mapsUrl = getMapsUrl();

  if (!trimmed || !mapsKey) return null;

  const upstream = new URL(`${mapsUrl}/v1/geocode`);
  upstream.searchParams.set("apikey", mapsKey);
  upstream.searchParams.set("query", trimmed);
  upstream.searchParams.set("lang", "en");
  upstream.searchParams.set("limit", "1");
  // No type filter — search all result types (address, street, regional, etc.)

  try {
    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      logger.error(
        { status: response.status, address: trimmed },
        "[mapy] Address validation geocode failed",
      );
      return null;
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];

    if (items.length === 0) return null;

    const item = items[0];
    const position = item.position;

    if (!position || typeof position.lat !== "number" || typeof position.lon !== "number") {
      return null;
    }

    // Check result type: if only an administrative region level, the street wasn't found.
    // Mapy.com result types: "regional.municipality", "regional.region",
    // "regional.country", "regional.address", "street", "address", "poi", etc.
    // Note: "regional.address" IS a valid street-level result — only reject pure admin types.
    const resultType: string = item.type ?? "";
    const ADMIN_REGION_TYPES = new Set([
      "regional.municipality",
      "regional.municipality_part",
      "regional.quarter",
      "regional.region",
      "regional.country",
    ]);
    if (ADMIN_REGION_TYPES.has(resultType)) {
      // The API only found a city/region, not a specific address → not a street result
      return null;
    }

    // Verify the result is in the expected city (prevent matching a same-name
    // street in a different city).
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
        state = entry.name;
      } else if (entry.type === "regional.country") {
        country = entry.name;
        countryCode = entry.isoCode ?? null;
      }
    }

    // If we have an expected city and it doesn't match, result is for a different city
    if (expectedCity && city) {
      const normalizedExpected = expectedCity.trim().toLowerCase();
      const normalizedCity = city.trim().toLowerCase();
      if (
        !normalizedCity.includes(normalizedExpected) &&
        !normalizedExpected.includes(normalizedCity)
      ) {
        return null;
      }
    }

    return {
      locationEwkt: `SRID=4326;POINT(${position.lon} ${position.lat})`,
      lat: position.lat,
      lon: position.lon,
      name: item.name ?? trimmed,
      city,
      state,
      stateCode,
      country,
      countryCode,
      postalCode: typeof item.zip === "string" && item.zip.length > 0 ? item.zip : null,
      formattedLabel: formatPlaceLabel({ city, state, countryCode }),
    };
  } catch (err) {
    logger.error({ err, address: trimmed }, "[mapy] Address validation error");
    return null;
  }
}

/** Combined geocode + timezone result returned by the cached helper. */
export interface CachedGeocodeResult {
  geo: GeocodeResult;
  timezone: string | null;
}

/**
 * Geocodes a LinkedIn location string with a shared database cache.
 *
 * Lookup flow:
 *  1. Normalise `location` → `location_key` (lowercased, trimmed).
 *  2. Check `geocode_cache` for a non-stale row (updated within the last
 *     {@link GEOCODE_CACHE_TTL_DAYS} days).
 *  3. On cache **hit** with `geocode_found = true` → return cached geo + timezone.
 *  4. On cache **hit** with `geocode_found = false` → return `null` (negative cache).
 *  5. On cache **miss** or stale → call `geocodeLinkedInLocation()` + optionally
 *     `getTimezoneForCoordinates()`, upsert the result, and return it.
 *
 * Uses an admin Supabase client internally so the public `geocode_cache` table
 * (service-role only RLS) is accessible regardless of the calling user's session.
 *
 * @param location - Raw location string from LinkedIn (e.g. "Brno, Czechia").
 * @returns Combined geocode result with timezone, or `null` when geocoding yields no result.
 */
export async function cachedGeocodeLinkedInLocation(
  location: string,
): Promise<CachedGeocodeResult | null> {
  const placeKey = location.trim().toLowerCase();
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
        // Negative cache — the location was previously looked up with no result
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
          postalCode: null,
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
    logger.error({ err }, "[mapy] Cache read failed, falling through to live geocode");
  }

  // ── 2. Live geocode + timezone ─────────────────────────────────────────
  // Capture whether the API key exists BEFORE calling so we can decide
  // whether a null result should be written to the negative cache.
  const mapsKeyConfigured = !!getMapsKey();
  const geo = await geocodeLinkedInLocation(location);
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
          place_original: location.trim(),
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
    } else if (mapsKeyConfigured) {
      // Negative cache — the API was called and returned no result.
      // Skipped when NEXT_PRIVATE_MAPS_KEY is not configured so that transient
      // misconfigurations don't poison the cache for 180 days.
      await admin.from("geocode_cache").upsert(
        {
          place_key: placeKey,
          place_original: location.trim(),
          geocode_found: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "place_key" },
      );
    }
  } catch (err) {
    // Cache write failure is non-fatal — log and return the live result
    logger.error({ err }, "[mapy] Cache upsert failed");
  }

  if (!geo) return null;

  return { geo, timezone };
}
