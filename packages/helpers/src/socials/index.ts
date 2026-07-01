export {
  CONTACT_SOCIAL_FIELD_KEYS,
  createSocialUrl,
  extractUsername,
  formatWhatsAppNumber,
  normalizePhoneSocialValue,
  processContactSocialFieldValue,
  socialPlatforms,
} from "./socials-helpers";
export type {
  ContactSocialFieldKey,
  ProcessContactSocialFieldResult,
  SocialPlatformConfig,
} from "./socials-helpers";

export { CONTACT_SOCIAL_BRAND_COLORS } from "./social-brand-colors";
export type { ContactSocialPlatform } from "./social-brand-colors";

export { normalizeWebsiteUrl } from "./normalize-website-url";
