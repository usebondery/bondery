import { geocodeSuggestResponseSchema, geocodeTimezoneResponseSchema } from "./schema.js";
import type { GeocodeSuggestAddress } from "./types.js";

export function parseGeocodeSuggestResponse(json: unknown): GeocodeSuggestAddress[] {
  const parsed = geocodeSuggestResponseSchema.parse(json);
  return parsed.addresses;
}

export function parseGeocodeTimezoneResponse(json: unknown): string | null {
  const parsed = geocodeTimezoneResponseSchema.parse(json);
  return parsed.timezone;
}
