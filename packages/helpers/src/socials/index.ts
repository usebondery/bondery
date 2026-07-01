export {
  CONTACT_SOCIAL_FIELD_KEYS,
  createSocialUrl,
  extractUsername,
  formatWhatsAppNumber,
  normalizePhoneSocialValue,
  processContactSocialFieldValue,
  socialPlatforms,
} from "#socials/socials-helpers.js";
export type {
  ContactSocialFieldKey,
  ProcessContactSocialFieldResult,
  SocialPlatformConfig,
} from "#socials/socials-helpers.js";

export { CONTACT_SOCIAL_BRAND_COLORS } from "#socials/social-brand-colors.js";
export type { ContactSocialPlatform } from "#socials/social-brand-colors.js";

export { normalizeWebsiteUrl } from "#socials/normalize-website-url.js";
