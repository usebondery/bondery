import { type ContactAddressEntry } from "../entities/address.js";
export declare function parseGeocodeSuggestResponse(json: unknown): ContactAddressEntry[];
export declare function parseGeocodeTimezoneResponse(json: unknown): string | null;
