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
} from "./globals/index";

export { parseInstagramUsername, linkedinCompanyUrl, extractLinkedinId } from "./platform/index";
export type { ParseInstagramUsernameInput, ParsedInstagramName } from "./platform/index";

export {
  stripEmojis,
  stripNameTitles,
  extractNameParts,
  cleanPersonName,
  parseFullName,
} from "./name/index";

export { formatDateRange, formatDuration } from "./date/index";

export {
  getReadingTime,
  parseInlineTokens,
  tokenToString,
  tokensToString,
  BP_TOKEN_RE,
} from "./text/index";
export type { InlineToken, InlineTokenType } from "./text/index";

export {
  formatPlaceLabel,
  formatAddressLabel,
  abbreviateLocationCountry,
} from "./address/index";
export type { PlaceLabelFields, AddressLabelFields } from "./address/index";

export {
  CONTACT_ADDRESS_TYPE_OPTIONS,
  CONTACT_CHANNEL_TYPE_OPTIONS,
  getContactAddressTypeEmoji,
  getContactChannelTypeEmoji,
} from "./contact/index";
export type { ContactAddressTypeOption, ContactChannelTypeOption } from "./contact/index";

export { compareVersions, isVersionBelow } from "./version/index";

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
} from "./socials/index";
export type {
  ContactSocialFieldKey,
  ContactSocialPlatform,
  ProcessContactSocialFieldResult,
  SocialPlatformConfig,
} from "./socials/index";

export { INTERACTION_TYPES } from "./interactions/index";

export {
  createContactFromFullNameSchema,
  normalizedSocialHandleSchema,
} from "./forms/index";
export type {
  CreateContactFromFullNameInput,
  CreateContactFromFullNameOutput,
  NormalizedSocialHandle,
} from "./forms/index";

export {
  buildGeocodeSuggestQuery,
  buildGeocodeTimezoneQuery,
  geocodeSuggestionDisplayKey,
  geocodeSuggestionDisplayLabel,
} from "./geocode/index";

export {
  combinePhoneNumber,
  countryCodes,
  DEFAULT_PHONE_REACT_MASK_EXPRESSION,
  formatPhoneNumber,
  getTelephoneReactMaskExpression,
  parsePhoneNumber,
  TELEPHONE_PREFIX_OPTIONS,
} from "./phone/index";
export type { CountryCode, TelephonePrefixOption } from "./phone/index";
