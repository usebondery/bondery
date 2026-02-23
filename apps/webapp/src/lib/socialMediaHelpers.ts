/**
 * Social media helper functions for handling usernames and URLs
 */

import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";

export interface SocialMediaPlatform {
  name: string;
  baseUrl: string;
  urlPattern: RegExp;
}

function escapeRegexValue(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const socialMediaPlatforms: Record<string, SocialMediaPlatform> = {
  linkedin: {
    name: "LinkedIn",
    baseUrl: SOCIAL_PLATFORM_URL_DETAILS.linkedin.profileBaseUrl,
    urlPattern: new RegExp(
      `(?:https?:\\/\\/)?(?:www\\.)?${escapeRegexValue(SOCIAL_PLATFORM_URL_DETAILS.linkedin.domain)}\\/in\\/([^\\/\\?]+)`,
      "i",
    ),
  },
  instagram: {
    name: "Instagram",
    baseUrl: SOCIAL_PLATFORM_URL_DETAILS.instagram.profileBaseUrl,
    urlPattern: new RegExp(
      `(?:https?:\\/\\/)?(?:www\\.)?${escapeRegexValue(SOCIAL_PLATFORM_URL_DETAILS.instagram.domain)}\\/([^\\/\\?]+)`,
      "i",
    ),
  },
  facebook: {
    name: "Facebook",
    baseUrl: "https://facebook.com/",
    urlPattern: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([^\/\?]+)/i,
  },
  whatsapp: {
    name: "WhatsApp",
    baseUrl: "https://wa.me/",
    urlPattern: /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?([\d]+)/i,
  },
};

/**
 * Extracts username from a social media URL
 * @param platform - The social media platform (linkedin, instagram, facebook, whatsapp)
 * @param input - The URL or username
 * @returns The extracted username or the input if it's already a username
 */
export function extractUsername(platform: string, input: string): string {
  if (!input) return "";

  const platformConfig = socialMediaPlatforms[platform];
  if (!platformConfig) return input;

  // If it looks like a URL, extract the username
  const match = input.match(platformConfig.urlPattern);
  if (match && match[1]) {
    return match[1];
  }

  // If it's already a username (no URL pattern), return as is
  return input.trim();
}

/**
 * Creates a full URL from a username
 * @param platform - The social media platform (linkedin, instagram, facebook, whatsapp)
 * @param username - The username
 * @returns The full URL or empty string if no username
 */
export function createSocialMediaUrl(platform: string, username: string): string {
  if (!username) return "";

  const platformConfig = socialMediaPlatforms[platform];
  if (!platformConfig) return username;

  // If it's already a full URL, return as is
  if (username.startsWith("http://") || username.startsWith("https://")) {
    return username;
  }

  return platformConfig.baseUrl + username;
}

/**
 * Formats a phone number for WhatsApp (removes non-numeric characters)
 * @param phone - The phone number
 * @returns The formatted phone number
 */
export function formatWhatsAppNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}
