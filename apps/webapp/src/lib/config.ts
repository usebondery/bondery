/**
 * Application configuration constants
 */

import type { ContactType, ImportantEventType, RelationshipType } from "@bondery/types";

export const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL!;
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL!;
export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const INPUT_MAX_LENGTHS = {
  firstName: 50,
  middleName: 50,
  lastName: 50,
  title: 100,
  place: 100,
  description: 500,
  dateName: 50,
} as const;

export const FEATURES = {
  birthdayNotifications: true,
} as const;

export const LIMITS = {
  maxImportantDates: 5,
} as const;

export const IMPORTANT_EVENT_TYPE_OPTIONS: ReadonlyArray<{
  value: ImportantEventType;
  emoji: string;
}> = [
  { value: "birthday", emoji: "🎂" },
  { value: "anniversary", emoji: "💍" },
  { value: "nameday", emoji: "🌼" },
  { value: "graduation", emoji: "🎓" },
  { value: "other", emoji: "📅" },
] as const;

export const IMPORTANT_EVENT_NOTIFY_OPTIONS: ReadonlyArray<{
  value: "none" | "1" | "3" | "7";
}> = [{ value: "none" }, { value: "1" }, { value: "3" }, { value: "7" }] as const;

export const RELATIONSHIP_TYPE_OPTIONS: ReadonlyArray<{
  value: RelationshipType;
  emoji: string;
}> = [
  { value: "parent", emoji: "👨‍👩‍👧" },
  { value: "child", emoji: "🧒" },
  { value: "spouse", emoji: "💍" },
  { value: "partner", emoji: "❤️" },
  { value: "sibling", emoji: "👫" },
  { value: "friend", emoji: "🤝" },
  { value: "colleague", emoji: "💼" },
  { value: "neighbor", emoji: "🏡" },
  { value: "guardian", emoji: "🛡️" },
  { value: "dependent", emoji: "🫶" },
  { value: "other", emoji: "🔗" },
] as const;

export const CONTACT_METHOD_TYPE_OPTIONS: ReadonlyArray<{
  value: ContactType;
  emoji: string;
  label: string;
}> = [
  { value: "home", emoji: "🏠", label: "Home" },
  { value: "work", emoji: "💼", label: "Work" },
] as const;

/**
 * Avatar upload configuration
 */
export const AVATAR_UPLOAD = {
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"] as const,
  maxFileSize: 5 * 1024 * 1024,
  maxFileSizeMB: 5,
} as const;

// Doherty threshold, used for max function reply time
export const MAX_DOHERTY_THRESHOLD = 0.7;

/**
 * Integration providers configuration
 */
export const INTEGRATION_PROVIDERS = [
  {
    provider: "github",
    providerKey: "github",
    displayName: "GitHub",
    iconColor: "dark",
    backgroundColor: "black",
    icon: "github",
    active: true,
  },
  {
    provider: "linkedin",
    providerKey: "linkedin_oidc",
    displayName: "LinkedIn",
    iconColor: "#0A66C2",
    backgroundColor: "#0A66C2",
    icon: "linkedin",
    active: true,
  },
] as const;

/**
 * Status page URL
 */
export const STATUS_URL = "https://bondery.openstatus.dev/";

/**
 * Social media links
 */
export const SOCIAL_LINKS = {
  github: "https://github.com/usebondery/bondery",
  linkedin: "https://linkedin.com/company/bondery",
  email: "team@usebondery.com",
} as const;
