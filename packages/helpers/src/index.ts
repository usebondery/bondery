export {
  WEBSITE_ROUTES,
  API_ROUTES,
  WEBAPP_ROUTES,
  GITHUB_REPO_URL,
  CHROME_EXTENSION_URL,
  MIN_EXTENSION_VERSION,
  HELP_DOCS_URL,
  CHANGELOG_URL,
  SUPPORT_EMAIL,
  STATUS_PAGE_URL,
  SOCIAL_LINKS,
  METADATA_TITLE_DIVIDER,
  WEBAPP_NAME,
  formatMetadataTitle,
  SOCIAL_PLATFORM_URL_DETAILS,
  IMPORTANT_DATE_TYPE_META,
} from "#globals/index.js";

export { parseInstagramUsername, linkedinCompanyUrl, extractLinkedinId } from "#platform/index.js";
export type { ParseInstagramUsernameInput, ParsedInstagramName } from "#platform/index.js";

export {
  stripEmojis,
  stripNameTitles,
  extractNameParts,
  cleanPersonName,
  parseFullName,
} from "#name/index.js";

export { formatDateRange, formatDuration } from "#date/index.js";

export {
  getReadingTime,
  parseInlineTokens,
  tokenToString,
  tokensToString,
  BP_TOKEN_RE,
} from "#text/index.js";
export type { InlineToken, InlineTokenType } from "#text/index.js";

export {
  formatPlaceLabel,
  formatAddressLabel,
  abbreviateLocationCountry,
} from "#address/index.js";
export type { PlaceLabelFields, AddressLabelFields } from "#address/index.js";

export {
  CONTACT_ADDRESS_TYPE_OPTIONS,
  CONTACT_CHANNEL_TYPE_OPTIONS,
  getContactAddressTypeEmoji,
  getContactChannelTypeEmoji,
} from "#contact/index.js";
export type { ContactAddressTypeOption, ContactChannelTypeOption } from "#contact/index.js";

export { compareVersions, isVersionBelow } from "#version/index.js";

export {
  CONTACT_SOCIAL_BRAND_COLORS,
  CONTACT_SOCIAL_FIELD_KEYS,
  createSocialUrl,
  extractUsername,
  formatWhatsAppNumber,
  normalizePhoneSocialValue,
  normalizeWebsiteUrl,
  processContactSocialFieldValue,
  socialPlatforms,
} from "#socials/index.js";
export type {
  ContactSocialFieldKey,
  ContactSocialPlatform,
  ProcessContactSocialFieldResult,
  SocialPlatformConfig,
} from "#socials/index.js";

export { INTERACTION_TYPES } from "#interactions/index.js";

export {
  createContactFromFullNameSchema,
  normalizedSocialHandleSchema,
} from "#forms/index.js";
export type {
  CreateContactFromFullNameInput,
  CreateContactFromFullNameOutput,
  NormalizedSocialHandle,
} from "#forms/index.js";

export {
  buildGeocodeSuggestQuery,
  buildGeocodeTimezoneQuery,
  geocodeSuggestionDisplayKey,
  geocodeSuggestionDisplayLabel,
} from "#geocode/index.js";

export {
  combinePhoneNumber,
  countryCodes,
  DEFAULT_PHONE_REACT_MASK_EXPRESSION,
  formatPhoneNumber,
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
  TELEPHONE_PREFIX_OPTIONS,
} from "#phone/index.js";
export type { CountryCode, TelephonePrefixOption } from "#phone/index.js";
