export {
  formatPlaceLabel,
  formatAddressLabel,
  abbreviateLocationCountry,
} from "./address-utils.js";
export type { PlaceLabelFields, AddressLabelFields } from "./address-utils.js";

export { parseMapSuggestionItem, parseMapSuggestions } from "./mapy-suggest.js";
export type { MapSuggestionItem, MapSuggestionRegionalEntry } from "./mapy-suggest.js";

export {
  mapSuggestionToContactAddress,
  buildManualContactAddress,
} from "./suggestion-to-contact-address.js";
export type { SuggestionToContactAddressOptions } from "./suggestion-to-contact-address.js";

export {
  GEOCODE_SUGGEST_DEBOUNCE_MS,
  GEOCODE_SUGGEST_MIN_QUERY_LENGTH,
} from "./geocode-suggest-config.js";
