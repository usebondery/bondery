export type ContactAddressType = "home" | "work" | "other";

export type ContactAddressGranularity = "address" | "city" | "state" | "country";

export type ContactAddressGeocodeSource = "mapy.com" | "manual";

export type ContactAddressConfidence = "verified" | "unverifiable";

export interface ContactAddressRead {
  addressCity: string | null;
  addressCountry: string | null;
  addressCountryCode: string | null;
  addressFormatted: string | null;
  addressGeocodeSource: ContactAddressGeocodeSource | null;
  addressGranularity: ContactAddressGranularity;
  addressLine1: string | null;
  addressLine2: string | null;
  addressPostalCode: string | null;
  addressState: string | null;
  addressStateCode: string | null;
  geocodeConfidence: ContactAddressConfidence | null;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  type: ContactAddressType;
  value: string;
}

export interface ContactAddressSheetInput {
  label: string;
  type: ContactAddressType;
  value: string;
}

export interface ContactAddressSheetOutput {
  label: string | null;
  type: ContactAddressType;
  value: string;
}

export interface ContactAddressEntryInput {
  addressCity: string | null;
  addressCountry: string | null;
  addressCountryCode: string | null;
  addressFormatted: string | null;
  addressGeocodeSource: ContactAddressGeocodeSource | null;
  addressGranularity: ContactAddressGranularity;
  addressLine1: string | null;
  addressLine2: string | null;
  addressPostalCode: string | null;
  addressState: string | null;
  addressStateCode: string | null;
  geocodeConfidence: ContactAddressConfidence | null;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  type: ContactAddressType;
  value: string;
}

export type ContactAddressEntryOutput = ContactAddressEntryInput;

export type ContactAddressEntry = ContactAddressEntryOutput;

export type GeocodeSuggestAddressInput = ContactAddressEntryInput;

export type GeocodeSuggestAddressOutput = ContactAddressEntryOutput;

export type ReplaceAddressesInput = ContactAddressEntry[];
