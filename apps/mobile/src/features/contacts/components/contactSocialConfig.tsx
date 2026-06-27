import type { ReactNode } from "react";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconPlus,
  IconWorld,
} from "@tabler/icons-react-native";
import {
  CONTACT_SOCIAL_BRAND_COLORS,
  CONTACT_SOCIAL_FIELD_KEYS,
  type ContactSocialFieldKey,
} from "@bondery/helpers";
import { SignalBrandIcon } from "./SignalBrandIcon";

export interface ContactSocialPlatformConfig {
  key: ContactSocialFieldKey;
  color: string;
  placeholderKey: string;
  accessibilityLabelKey: string;
  renderIcon: (color: string) => ReactNode;
}

export const CONTACT_SOCIAL_PLATFORMS: ContactSocialPlatformConfig[] = CONTACT_SOCIAL_FIELD_KEYS.map(
  (key) => {
    const color = CONTACT_SOCIAL_BRAND_COLORS[key];

    const configs: Record<ContactSocialFieldKey, Omit<ContactSocialPlatformConfig, "key" | "color">> = {
      linkedin: {
        placeholderKey: "Socials.LinkedInPlaceholder",
        accessibilityLabelKey: "Socials.OpenInLinkedIn",
        renderIcon: (iconColor) => <IconBrandLinkedin size={20} stroke={iconColor} />,
      },
      instagram: {
        placeholderKey: "Socials.InstagramPlaceholder",
        accessibilityLabelKey: "Socials.OpenInInstagram",
        renderIcon: (iconColor) => <IconBrandInstagram size={20} stroke={iconColor} />,
      },
      facebook: {
        placeholderKey: "Socials.FacebookPlaceholder",
        accessibilityLabelKey: "Socials.OpenInFacebook",
        renderIcon: (iconColor) => <IconBrandFacebook size={20} stroke={iconColor} />,
      },
      whatsapp: {
        placeholderKey: "Socials.WhatsAppPlaceholder",
        accessibilityLabelKey: "Socials.OpenInWhatsApp",
        renderIcon: (iconColor) => <IconBrandWhatsapp size={20} stroke={iconColor} />,
      },
      signal: {
        placeholderKey: "Socials.SignalPlaceholder",
        accessibilityLabelKey: "Socials.OpenInSignal",
        renderIcon: (iconColor) => <SignalBrandIcon size={20} color={iconColor} />,
      },
      website: {
        placeholderKey: "Socials.WebsitePlaceholder",
        accessibilityLabelKey: "Socials.OpenWebsite",
        renderIcon: (iconColor) => <IconWorld size={20} stroke={iconColor} />,
      },
    };

    return {
      key,
      color,
      ...configs[key],
    };
  },
);

export function getContactSocialPlatform(key: ContactSocialFieldKey): ContactSocialPlatformConfig {
  const platform = CONTACT_SOCIAL_PLATFORMS.find((item) => item.key === key);
  if (!platform) {
    throw new Error(`Unknown social platform: ${key}`);
  }

  return platform;
}

export function renderContactSocialAddIcon(color: string) {
  return <IconPlus size={20} stroke={color} />;
}
