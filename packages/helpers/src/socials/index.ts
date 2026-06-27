export {
  CONTACT_SOCIAL_FIELD_KEYS,
  createSocialUrl,
  extractUsername,
  formatWhatsAppNumber,
  normalizePhoneSocialValue,
  processContactSocialFieldValue,
  socialPlatforms,
} from "./socials-helpers.js";
export type {
  ContactSocialFieldKey,
  ProcessContactSocialFieldResult,
  SocialPlatformConfig,
} from "./socials-helpers.js";

export { CONTACT_SOCIAL_BRAND_COLORS } from "./social-brand-colors.js";
export type { ContactSocialPlatform } from "./social-brand-colors.js";

export { normalizeWebsiteUrl } from "./normalize-website-url.js";
