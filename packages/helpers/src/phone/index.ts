/**
 * Phone number utilities, country dial codes, and prefix options.
 * Shared across webapp, mobile, and API.
 */

export { countryCodes } from "#phone/country-codes.js";
export { getCountryCodeForTimezone } from "#phone/phone-default-country.js";
export { createPhoneEntrySchema, createReplacePhonesSchema } from "#phone/phone-entry-schema.js";
export {
  callingCodeToDefaultCountry,
  canonicalizeDialCode,
  countryToCallingCode,
  formatDialCodeForDisplay,
  type NormalizedPhone,
  type NormalizePhoneError,
  type NormalizePhoneResult,
  normalizePhoneInput,
  normalizePhoneParts,
  normalizePhoneSocialStorage,
  phoneIdentityKey,
  resolveDefaultPhoneCountry,
  resolveTelephonePaste,
} from "#phone/phone-normalize.js";
export {
  combinePhoneNumber,
  formatPhoneNumber,
  parsePhoneNumber,
  parsePhoneParts,
} from "#phone/phone-utils.js";
export {
  compareTelephonePrefixByDialDigits,
  findTelephonePrefixOption,
  getTelephonePrefixSearchTexts,
  getTelephoneReactMaskExpression,
  TELEPHONE_PREFIX_OPTIONS,
} from "#phone/prefix-options.js";
export type { CountryCode, TelephonePrefixOption } from "#phone/types.js";
export { DEFAULT_PHONE_REACT_MASK_EXPRESSION } from "#phone/types.js";
