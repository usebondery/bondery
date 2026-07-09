export type { AddressLabelFields, PlaceLabelFields } from "#address/index.js";
export {
  abbreviateLocationCountry,
  formatAddressLabel,
  formatPlaceLabel,
} from "#address/index.js";
export type {
  ContactAddressTypeOption,
  ContactChannelTypeOption,
  ContactNameFields,
} from "#contact/index.js";
export {
  CONTACT_ADDRESS_TYPE_OPTIONS,
  CONTACT_CHANNEL_TYPE_OPTIONS,
  formatContactName,
  getContactAddressTypeEmoji,
  getContactChannelTypeEmoji,
} from "#contact/index.js";
export { formatDateRange, formatDuration } from "#date/index.js";
export { DOC_LINKS, type DocId, docHref } from "#docs/index.js";
export type {
  CreateContactFromFullNameInput,
  CreateContactFromFullNameOutput,
  NormalizedSocialHandle,
} from "#forms/index.js";
export {
  createContactFromFullNameSchema,
  normalizedSocialHandleSchema,
} from "#forms/index.js";
export {
  buildGeocodeSuggestQuery,
  buildGeocodeTimezoneQuery,
  geocodeSuggestionDisplayKey,
  geocodeSuggestionDisplayLabel,
} from "#geocode/index.js";
export {
  API_ROUTES,
  CHANGELOG_URL,
  CHROME_EXTENSION_URL,
  formatMetadataTitle,
  GITHUB_REPO_URL,
  HELP_DOCS_URL,
  IMPORTANT_DATE_TYPE_META,
  METADATA_TITLE_DIVIDER,
  MIN_EXTENSION_VERSION,
  SOCIAL_LINKS,
  SOCIAL_PLATFORM_URL_DETAILS,
  STATUS_PAGE_URL,
  SUPPORT_EMAIL,
  WEBAPP_NAME,
  WEBAPP_ROUTES,
  WEBSITE_ROUTES,
} from "#globals/index.js";
export { INTERACTION_TYPES } from "#interactions/index.js";
export {
  cleanPersonName,
  extractNameParts,
  parseFullName,
  stripEmojis,
  stripNameTitles,
} from "#name/index.js";
export type { CountryCode, TelephonePrefixOption } from "#phone/index.js";
export {
  combinePhoneNumber,
  countryCodes,
  DEFAULT_PHONE_REACT_MASK_EXPRESSION,
  formatPhoneNumber,
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
  TELEPHONE_PREFIX_OPTIONS,
} from "#phone/index.js";
export type { ParsedInstagramName, ParseInstagramUsernameInput } from "#platform/index.js";
export { extractLinkedinId, linkedinCompanyUrl, parseInstagramUsername } from "#platform/index.js";
export type {
  AnalyzeSocialFieldInputOptions,
  AnalyzeSocialFieldInputResult,
  ContactSocialFieldCommitAction,
  ContactSocialFieldCommitErrorCode,
  ContactSocialFieldKey,
  ContactSocialPlatform,
  ProcessContactSocialFieldResult,
  SocialInputRerouteReason,
  SocialPlatformConfig,
} from "#socials/index.js";
export {
  analyzeSocialFieldInput,
  CONTACT_SOCIAL_BRAND_COLORS,
  CONTACT_SOCIAL_FIELD_KEYS,
  createSocialUrl,
  extractUsername,
  formatWhatsAppNumber,
  normalizePhoneSocialValue,
  normalizeWebsiteUrl,
  processContactSocialFieldValue,
  resolveContactSocialFieldCommit,
  socialPlatforms,
} from "#socials/index.js";
export type { InlineToken, InlineTokenType } from "#text/index.js";
export {
  BP_TOKEN_RE,
  getReadingTime,
  parseInlineTokens,
  tokensToString,
  tokenToString,
} from "#text/index.js";
export { compareVersions, isVersionBelow } from "#version/index.js";
