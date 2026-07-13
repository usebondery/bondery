/**
 * Phone number utilities, country dial codes, and prefix options.
 * Shared across webapp, mobile, and API.
 */

export { countryCodes } from "#phone/country-codes.js";
export { combinePhoneNumber, formatPhoneNumber, parsePhoneNumber } from "#phone/phone-utils.js";
export {
  getTelephoneReactMaskExpression,
  TELEPHONE_PREFIX_OPTIONS,
} from "#phone/prefix-options.js";
export type { CountryCode, TelephonePrefixOption } from "#phone/types.js";
export { DEFAULT_PHONE_REACT_MASK_EXPRESSION } from "#phone/types.js";
