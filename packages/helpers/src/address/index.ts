export {
  formatPlaceLabel,
  formatAddressLabel,
  abbreviateLocationCountry,
} from "#address/address-utils.js";
export type { PlaceLabelFields, AddressLabelFields } from "#address/address-utils.js";

export { parseMapSuggestionItem, parseMapSuggestions } from "#address/mapy-suggest.js";
export type { MapSuggestionItem, MapSuggestionRegionalEntry } from "#address/mapy-suggest.js";

export {
  mapSuggestionToContactAddress,
  buildManualContactAddress,
} from "#address/suggestion-to-contact-address.js";
export type { SuggestionToContactAddressOptions } from "#address/suggestion-to-contact-address.js";

export {
  GEOCODE_SUGGEST_DEBOUNCE_MS,
  GEOCODE_SUGGEST_MIN_QUERY_LENGTH,
} from "#address/geocode-suggest-config.js";
