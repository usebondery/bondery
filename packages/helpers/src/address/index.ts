export type { AddressLabelFields, PlaceLabelFields } from "#address/address-utils.js";
export {
  abbreviateLocationCountry,
  formatAddressLabel,
  formatPlaceLabel,
} from "#address/address-utils.js";
export {
  GEOCODE_SUGGEST_DEBOUNCE_MS,
  GEOCODE_SUGGEST_MIN_QUERY_LENGTH,
} from "#address/geocode-suggest-config.js";
export type { MapSuggestionItem, MapSuggestionRegionalEntry } from "#address/mapy-suggest.js";
export { parseMapSuggestionItem, parseMapSuggestions } from "#address/mapy-suggest.js";
export type { SuggestionToContactAddressOptions } from "#address/suggestion-to-contact-address.js";
export {
  buildManualContactAddress,
  mapSuggestionToContactAddress,
} from "#address/suggestion-to-contact-address.js";
