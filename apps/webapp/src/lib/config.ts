/**
 * Application configuration constants
 */

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
  maxImportantDates: 3,
} as const;

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
  github: "https://github.com/sveetya/bondery",
  linkedin: "https://www.linkedin.com/company/bondery",
  email: "team@usebondery.com",
} as const;
