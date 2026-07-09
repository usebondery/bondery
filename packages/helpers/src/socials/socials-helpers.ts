import { SOCIAL_PLATFORM_URL_DETAILS } from "#globals/social-platform-urls.js";
import { combinePhoneNumber } from "#phone/index.js";
import { normalizeWebsiteUrl } from "#socials/normalize-website-url.js";

export interface SocialPlatformConfig {
  baseUrl: string;
  name: string;
  urlPattern: RegExp;
}

function escapeRegexValue(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const socialPlatforms: Record<string, SocialPlatformConfig> = {
  facebook: {
    baseUrl: SOCIAL_PLATFORM_URL_DETAILS.facebook.profileBaseUrl,
    name: "Facebook",
    urlPattern: new RegExp(
      `(?:https?:\\/\\/)?(?:www\\.)?${escapeRegexValue(SOCIAL_PLATFORM_URL_DETAILS.facebook.domain)}\\/([^\\/\\?]+)`,
      "i",
    ),
  },
  instagram: {
    baseUrl: SOCIAL_PLATFORM_URL_DETAILS.instagram.profileBaseUrl,
    name: "Instagram",
    urlPattern: new RegExp(
      `(?:https?:\\/\\/)?(?:www\\.)?${escapeRegexValue(SOCIAL_PLATFORM_URL_DETAILS.instagram.domain)}\\/([^\\/\\?]+)`,
      "i",
    ),
  },
  linkedin: {
    baseUrl: SOCIAL_PLATFORM_URL_DETAILS.linkedin.profileBaseUrl,
    name: "LinkedIn",
    urlPattern: new RegExp(
      `(?:https?:\\/\\/)?(?:www\\.)?${escapeRegexValue(SOCIAL_PLATFORM_URL_DETAILS.linkedin.domain)}\\/in\\/([^\\/\\?]+)`,
      "i",
    ),
  },
  whatsapp: {
    baseUrl: SOCIAL_PLATFORM_URL_DETAILS.whatsapp.deepLinkBaseUrl,
    name: "WhatsApp",
    urlPattern: /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?([\d]+)/i,
  },
};

export type ContactSocialFieldKey =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "website"
  | "whatsapp"
  | "signal";

export const CONTACT_SOCIAL_FIELD_KEYS = [
  "linkedin",
  "instagram",
  "facebook",
  "whatsapp",
  "signal",
  "website",
] as const satisfies readonly ContactSocialFieldKey[];

/**
 * Extracts username from a social media URL.
 */
export function extractUsername(platform: string, input: string): string {
  if (!input) {
    return "";
  }

  const platformConfig = socialPlatforms[platform];
  if (!platformConfig) {
    return input.trim();
  }

  const match = input.match(platformConfig.urlPattern);
  if (match?.[1]) {
    return match[1];
  }

  return input.trim();
}

/**
 * Creates a full URL from a stored social handle.
 */
export function createSocialUrl(platform: string, username: string): string {
  if (!username) {
    return "";
  }

  if (platform === "website") {
    if (username.startsWith("http://") || username.startsWith("https://")) {
      return username;
    }

    return normalizeWebsiteUrl(username) ?? username;
  }

  if (platform === "signal") {
    const digits = username.replace(/\D/g, "");
    return digits ? `https://signal.me/#p/${digits}` : "";
  }

  const platformConfig = socialPlatforms[platform];
  if (!platformConfig) {
    return username;
  }

  if (username.startsWith("http://") || username.startsWith("https://")) {
    return username;
  }

  if (platform === "whatsapp") {
    return platformConfig.baseUrl + formatWhatsAppNumber(username);
  }

  return platformConfig.baseUrl + username;
}

/**
 * Formats a phone number for WhatsApp (removes non-numeric characters).
 */
export function formatWhatsAppNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normalizes a phone-based social value (WhatsApp / Signal) for API storage.
 */
export function normalizePhoneSocialValue(platform: "whatsapp" | "signal", input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (platform === "whatsapp") {
    const fromUrl = extractUsername("whatsapp", trimmed);
    if (fromUrl !== trimmed) {
      const digits = formatWhatsAppNumber(fromUrl);
      return digits ? `+${digits}` : "";
    }
  }

  let cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

export interface ProcessContactSocialFieldResult {
  error?: string;
  value: string;
}

export type ContactSocialFieldCommitErrorCode = "invalid_website";

export type ContactSocialFieldCommitAction =
  | { action: "noop" }
  | { action: "clear" }
  | { action: "save"; value: string }
  | { action: "error"; code: ContactSocialFieldCommitErrorCode };

/**
 * Resolves what a social-field commit should do given draft input and persisted value.
 * Empty input with a prior value clears; empty with no prior value is a noop.
 */
export function resolveContactSocialFieldCommit(
  field: ContactSocialFieldKey,
  rawValue: string,
  persistedValue: string,
  options?: { dialCode?: string },
): ContactSocialFieldCommitAction {
  const persisted = persistedValue.trim();
  const processed = processContactSocialFieldValue(field, rawValue, options);

  if (processed.error === "invalid_website") {
    return { action: "error", code: "invalid_website" };
  }

  const nextValue = processed.value;

  if (nextValue === persisted) {
    return { action: "noop" };
  }

  if (!nextValue) {
    return persisted ? { action: "clear" } : { action: "noop" };
  }

  return { action: "save", value: nextValue };
}

/**
 * Processes raw user input for a contact social field before PATCH.
 * Mirrors webapp SocialsSection saveField behavior.
 */
export function processContactSocialFieldValue(
  field: ContactSocialFieldKey,
  rawValue: string,
  options?: { dialCode?: string },
): ProcessContactSocialFieldResult {
  const inputValue = rawValue.trim();

  if (!inputValue) {
    return { value: "" };
  }

  if (field === "linkedin" || field === "instagram" || field === "facebook") {
    return { value: extractUsername(field, inputValue) };
  }

  if (field === "whatsapp" || field === "signal") {
    if (options?.dialCode) {
      const numberOnly = inputValue.replace(/[^\d]/g, "");
      if (!numberOnly) {
        return { value: "" };
      }

      return { value: combinePhoneNumber(options.dialCode, inputValue) };
    }

    return { value: normalizePhoneSocialValue(field, inputValue) };
  }

  if (field === "website") {
    const normalizedWebsite = normalizeWebsiteUrl(inputValue);

    if (normalizedWebsite === null) {
      return { error: "invalid_website", value: "" };
    }

    return { value: normalizedWebsite };
  }

  return { value: inputValue };
}
