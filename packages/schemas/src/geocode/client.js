import { geocodeSuggestResponseSchema, geocodeTimezoneResponseSchema, } from "../entities/address.js";
export function parseGeocodeSuggestResponse(json) {
    const parsed = geocodeSuggestResponseSchema.parse(json);
    return parsed.addresses;
}
export function parseGeocodeTimezoneResponse(json) {
    const parsed = geocodeTimezoneResponseSchema.parse(json);
    return parsed.timezone;
}
