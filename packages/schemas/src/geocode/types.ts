import type { ContactAddressRead } from "#entities/address/types.js";

/** Parsed geocode suggest address entry (wire shape — no input transforms). */
export type GeocodeSuggestAddress = ContactAddressRead;

export interface GeocodeSuggestResponse {
  addresses: GeocodeSuggestAddress[];
}

export interface GeocodeTimezoneResponse {
  timezone: string | null;
}
