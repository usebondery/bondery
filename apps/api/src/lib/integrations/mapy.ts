import { prisma } from "@bondery/db";
import { formatPlaceLabel } from "@bondery/helpers/address";
import logger from "../platform/logger.js";

const MAPS_BASE_URL = "https://api.mapy.com";

/** Cache entries older than this are refreshed from the upstream API. */
const GEOCODE_CACHE_TTL_DAYS = 180;

/** Read at call time — env is populated by @fastify/env after module load. */
function getMapsKey(): string {
  return process.env.BONDERY_PRIVATE_MAPS_KEY || "";
}

function getMapsUrl(): string {
  return process.env.BONDERY_PUBLIC_MAPS_URL || MAPS_BASE_URL;
}

/** Structured result from geocoding a LinkedIn location string. */
interface GeocodeResult {
  city: string | null;
  country: string | null;
  countryCode: string | null;
  formattedLabel: string | null;
  /** Latitude — used for subsequent timezone lookup, NOT for DB insert (generated column). */
  lat: number;
  /** PostGIS EWKT string for direct insert/update of the `location` geography column. */
  locationEwkt: string;
  /** Longitude — used for subsequent timezone lookup, NOT for DB insert (generated column). */
  lon: number;
  name: string;
  postalCode: string | null;
  state: string | null;
  stateCode: string | null;
}

/**
 * Parses a LinkedIn location string into a query and optional locality (country)
 * for the mapy.com geocode API.
 */
function parseLinkedInLocation(location: string): { query: string; locality?: string } {
  const trimmed = location.trim();
  const parts = trimmed
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);

  const [query, ...rest] = parts;
  if (query === undefined) {
    return { query: trimmed };
  }

  const locality = rest.at(-1);
  if (locality === undefined) {
    return { query };
  }

  return { locality, query };
}

export type { GeocodeResult };

/**
 * Geocodes a LinkedIn-scraped location string using the Mapy.com /v1/geocode API.
 */
export async function geocodeLinkedInLocation(location: string): Promise<GeocodeResult | null> {
  const trimmed = location.trim();
  const mapsKey = getMapsKey();
  const mapsUrl = getMapsUrl();

  if (!trimmed || !mapsKey) {
    if (!mapsKey) {
      logger.warn("[mapy] BONDERY_PRIVATE_MAPS_KEY is not configured, skipping geocode");
    }
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
      headers: { Accept: "application/json" },
      method: "GET",
    });

    if (!response.ok) {
      logger.error({ location: trimmed, status: response.status }, "[mapy] Geocode failed");
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

    const regional: Array<{ name: string; type: string; isoCode?: string }> = Array.isArray(
      item.regionalStructure,
    )
      ? item.regionalStructure
      : [];

    let city: string | null = null;
    let state: string | null = null;
    const stateCode: string | null = null;
    let country: string | null = null;
    let countryCode: string | null = null;

    for (const entry of regional) {
      if (entry.type === "regional.municipality" || entry.type === "regional.municipality_part") {
        if (city === null || city === "") {
          city = entry.name;
        }
      } else if (entry.type === "regional.region") {
        state = entry.name;
      } else if (entry.type === "regional.country") {
        country = entry.name;
        countryCode = entry.isoCode ?? null;
      }
    }

    return {
      city,
      country,
      countryCode,
      formattedLabel: formatPlaceLabel({ city, countryCode, state }),
      lat: position.lat,
      locationEwkt: `SRID=4326;POINT(${position.lon} ${position.lat})`,
      lon: position.lon,
      name: item.name ?? query,
      postalCode: typeof item.zip === "string" && item.zip.length > 0 ? item.zip : null,
      state,
      stateCode,
    };
  } catch (error) {
    logger.error({ err: error, location: trimmed }, "[mapy] Geocode error");
    return null;
  }
}

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
      headers: { Accept: "application/json" },
      method: "GET",
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "[mapy] Timezone lookup failed");
      return null;
    }

    const payload = await response.json();
    const timezoneName = payload?.timezone?.timezoneName;

    return typeof timezoneName === "string" && timezoneName.length > 0 ? timezoneName : null;
  } catch (error) {
    logger.error({ err: error }, "[mapy] Timezone lookup error");
    return null;
  }
}

export async function validateStreetAddress(
  query: string,
  expectedCity: string,
): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  const mapsKey = getMapsKey();
  const mapsUrl = getMapsUrl();

  if (!trimmed || !mapsKey) {
    return null;
  }

  const upstream = new URL(`${mapsUrl}/v1/geocode`);
  upstream.searchParams.set("apikey", mapsKey);
  upstream.searchParams.set("query", trimmed);
  upstream.searchParams.set("lang", "en");
  upstream.searchParams.set("limit", "1");

  try {
    const response = await fetch(upstream.toString(), {
      headers: { Accept: "application/json" },
      method: "GET",
    });

    if (!response.ok) {
      logger.error(
        { address: trimmed, status: response.status },
        "[mapy] Address validation geocode failed",
      );
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

    const resultType: string = item.type ?? "";
    const ADMIN_REGION_TYPES = new Set([
      "regional.municipality",
      "regional.municipality_part",
      "regional.quarter",
      "regional.region",
      "regional.country",
    ]);
    if (ADMIN_REGION_TYPES.has(resultType)) {
      return null;
    }

    const regional: Array<{ name: string; type: string; isoCode?: string }> = Array.isArray(
      item.regionalStructure,
    )
      ? item.regionalStructure
      : [];

    let city: string | null = null;
    let state: string | null = null;
    const stateCode: string | null = null;
    let country: string | null = null;
    let countryCode: string | null = null;

    for (const entry of regional) {
      if (entry.type === "regional.municipality" || entry.type === "regional.municipality_part") {
        if (city === null || city === "") {
          city = entry.name;
        }
      } else if (entry.type === "regional.region") {
        state = entry.name;
      } else if (entry.type === "regional.country") {
        country = entry.name;
        countryCode = entry.isoCode ?? null;
      }
    }

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
      city,
      country,
      countryCode,
      formattedLabel: formatPlaceLabel({ city, countryCode, state }),
      lat: position.lat,
      locationEwkt: `SRID=4326;POINT(${position.lon} ${position.lat})`,
      lon: position.lon,
      name: item.name ?? trimmed,
      postalCode: typeof item.zip === "string" && item.zip.length > 0 ? item.zip : null,
      state,
      stateCode,
    };
  } catch (error) {
    logger.error({ address: trimmed, err: error }, "[mapy] Address validation error");
    return null;
  }
}

/** Combined geocode + timezone result returned by the cached helper. */
export interface CachedGeocodeResult {
  geo: GeocodeResult;
  timezone: string | null;
}

export async function cachedGeocodeLinkedInLocation(
  location: string,
): Promise<CachedGeocodeResult | null> {
  const placeKey = location.trim().toLowerCase();
  if (!placeKey) {
    return null;
  }

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - GEOCODE_CACHE_TTL_DAYS);

  try {
    const cached = await prisma.geocodeCache.findFirst({
      where: {
        placeKey,
        updatedAt: { gte: staleThreshold },
      },
    });

    if (cached) {
      if (!cached.geocodeFound) {
        return null;
      }

      if (cached.lat == null || cached.lon == null || cached.locationEwkt == null) {
        return null;
      }

      return {
        geo: {
          city: cached.city ?? null,
          country: cached.country ?? null,
          countryCode: cached.countryCode ?? null,
          formattedLabel:
            formatPlaceLabel({
              city: cached.city,
              countryCode: cached.countryCode,
              state: cached.state,
            }) || null,
          lat: cached.lat,
          locationEwkt: cached.locationEwkt,
          lon: cached.lon,
          name: cached.name ?? placeKey,
          postalCode: null,
          state: cached.state ?? null,
          stateCode: cached.stateCode ?? null,
        },
        timezone: cached.timezone ?? null,
      };
    }
  } catch (error) {
    logger.error({ err: error }, "[mapy] Cache read failed, falling through to live geocode");
  }

  const mapsKeyConfigured = !!getMapsKey();
  const geo = await geocodeLinkedInLocation(location);
  let timezone: string | null = null;

  if (geo) {
    timezone = await getTimezoneForCoordinates(geo.lat, geo.lon);
  }

  try {
    if (geo) {
      await prisma.geocodeCache.upsert({
        create: {
          city: geo.city,
          country: geo.country,
          countryCode: geo.countryCode,
          formattedLabel: geo.formattedLabel,
          geocodeFound: true,
          lat: geo.lat,
          locationEwkt: geo.locationEwkt,
          lon: geo.lon,
          name: geo.name,
          placeKey,
          placeOriginal: location.trim(),
          state: geo.state,
          stateCode: geo.stateCode,
          timezone,
        },
        update: {
          city: geo.city,
          country: geo.country,
          countryCode: geo.countryCode,
          formattedLabel: geo.formattedLabel,
          geocodeFound: true,
          lat: geo.lat,
          locationEwkt: geo.locationEwkt,
          lon: geo.lon,
          name: geo.name,
          placeOriginal: location.trim(),
          state: geo.state,
          stateCode: geo.stateCode,
          timezone,
        },
        where: { placeKey },
      });
    } else if (mapsKeyConfigured) {
      await prisma.geocodeCache.upsert({
        create: {
          geocodeFound: false,
          placeKey,
          placeOriginal: location.trim(),
        },
        update: {
          geocodeFound: false,
          placeOriginal: location.trim(),
        },
        where: { placeKey },
      });
    }
  } catch (error) {
    logger.error({ err: error }, "[mapy] Cache upsert failed");
  }

  if (!geo) {
    return null;
  }

  return { geo, timezone };
}
