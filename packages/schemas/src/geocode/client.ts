import {
  type GeocodeSuggestAddressWire,
  geocodeSuggestResponseSchema,
  geocodeTimezoneResponseSchema,
} from "#geocode/schemas.js";

export type ContactAddressEntry = GeocodeSuggestAddressWire;

export function parseGeocodeSuggestResponse(json: unknown): ContactAddressEntry[] {
  const parsed = geocodeSuggestResponseSchema.parse(json);
  return parsed.addresses;
}

export function parseGeocodeTimezoneResponse(json: unknown): string | null {
  const parsed = geocodeTimezoneResponseSchema.parse(json);
  return parsed.timezone;
}
