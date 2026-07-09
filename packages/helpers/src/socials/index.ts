export type {
  AnalyzeSocialFieldInputOptions,
  AnalyzeSocialFieldInputResult,
  SocialInputRerouteReason,
} from "#socials/analyze-social-input.js";
export { analyzeSocialFieldInput } from "#socials/analyze-social-input.js";
export { normalizeWebsiteUrl } from "#socials/normalize-website-url.js";
export type { ContactSocialPlatform } from "#socials/social-brand-colors.js";

export { CONTACT_SOCIAL_BRAND_COLORS } from "#socials/social-brand-colors.js";
export type {
  ContactSocialFieldCommitAction,
  ContactSocialFieldCommitErrorCode,
  ContactSocialFieldKey,
  ProcessContactSocialFieldResult,
  SocialPlatformConfig,
} from "#socials/socials-helpers.js";
export {
  CONTACT_SOCIAL_FIELD_KEYS,
  createSocialUrl,
  extractUsername,
  formatWhatsAppNumber,
  normalizePhoneSocialValue,
  processContactSocialFieldValue,
  resolveContactSocialFieldCommit,
  socialPlatforms,
} from "#socials/socials-helpers.js";
