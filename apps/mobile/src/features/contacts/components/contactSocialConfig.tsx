import {
  CONTACT_SOCIAL_BRAND_COLORS,
  CONTACT_SOCIAL_FIELD_KEYS,
  type ContactSocialFieldKey,
} from "@bondery/helpers";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconPlus,
  IconWorld,
} from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { SignalBrandIcon } from "./SignalBrandIcon";

export interface ContactSocialPlatformConfig {
  accessibilityLabelKey: string;
  color: string;
  key: ContactSocialFieldKey;
  placeholderKey: string;
  renderIcon: (color: string) => ReactNode;
}

export const CONTACT_SOCIAL_PLATFORMS: ContactSocialPlatformConfig[] =
  CONTACT_SOCIAL_FIELD_KEYS.map((key) => {
    const color = CONTACT_SOCIAL_BRAND_COLORS[key];

    const configs: Record<
      ContactSocialFieldKey,
      Omit<ContactSocialPlatformConfig, "key" | "color">
    > = {
      facebook: {
        accessibilityLabelKey: "Socials.OpenInFacebook",
        placeholderKey: "Socials.FacebookPlaceholder",
        renderIcon: (iconColor) => <IconBrandFacebook size={20} stroke={iconColor} />,
      },
      instagram: {
        accessibilityLabelKey: "Socials.OpenInInstagram",
        placeholderKey: "Socials.InstagramPlaceholder",
        renderIcon: (iconColor) => <IconBrandInstagram size={20} stroke={iconColor} />,
      },
      linkedin: {
        accessibilityLabelKey: "Socials.OpenInLinkedIn",
        placeholderKey: "Socials.LinkedInPlaceholder",
        renderIcon: (iconColor) => <IconBrandLinkedin size={20} stroke={iconColor} />,
      },
      signal: {
        accessibilityLabelKey: "Socials.OpenInSignal",
        placeholderKey: "Socials.SignalPlaceholder",
        renderIcon: (iconColor) => <SignalBrandIcon color={iconColor} size={20} />,
      },
      website: {
        accessibilityLabelKey: "Socials.OpenWebsite",
        placeholderKey: "Socials.WebsitePlaceholder",
        renderIcon: (iconColor) => <IconWorld size={20} stroke={iconColor} />,
      },
      whatsapp: {
        accessibilityLabelKey: "Socials.OpenInWhatsApp",
        placeholderKey: "Socials.WhatsAppPlaceholder",
        renderIcon: (iconColor) => <IconBrandWhatsapp size={20} stroke={iconColor} />,
      },
    };

    return {
      color,
      key,
      ...configs[key],
    };
  });

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
