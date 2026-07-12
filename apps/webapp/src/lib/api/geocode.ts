import { GEOCODE_SUGGEST_MIN_QUERY_LENGTH } from "@bondery/helpers/address";
import { buildGeocodeSuggestQuery, buildGeocodeTimezoneQuery } from "@bondery/helpers/geocode";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  type GeocodeSuggestAddress,
  parseGeocodeSuggestResponse,
  parseGeocodeTimezoneResponse,
} from "@bondery/schemas/geocode";
import { clientApiJsonOrNull } from "@/lib/api/client";

/**
 * Fetches address/place autocomplete suggestions via the same-origin BFF.
 */
export async function fetchGeocodeSuggestions(
  query: string,
  mode: "address" | "place" = "address",
  signal?: AbortSignal,
): Promise<GeocodeSuggestAddress[]> {
  const trimmed = query.trim();
  if (trimmed.length < GEOCODE_SUGGEST_MIN_QUERY_LENGTH) {
    return [];
  }

  try {
    const json = await clientApiJsonOrNull<unknown>(
      `${API_ROUTES.GEOCODE_SUGGEST}?${buildGeocodeSuggestQuery(trimmed, mode)}`,
      { signal },
    );
    if (!json) {
      return [];
    }
    return parseGeocodeSuggestResponse(json);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    return [];
  }
}

/**
 * Fetches the IANA timezone identifier for a coordinate pair via the Bondery geocode proxy.
 */
export async function fetchTimezoneForCoordinates(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  try {
    const json = await clientApiJsonOrNull<unknown>(
      `${API_ROUTES.GEOCODE_TIMEZONE}?${buildGeocodeTimezoneQuery(lat, lon)}`,
      { signal },
    );
    if (!json) {
      return null;
    }
    return parseGeocodeTimezoneResponse(json);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}
