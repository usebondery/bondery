/**
 * Brand colors for contact social platform buttons (LinkedIn, Instagram, etc.).
 * Distinct from SOCIAL_LINKS in paths.ts which are Bondery's own social profiles.
 */
export const CONTACT_SOCIAL_BRAND_COLORS = {
  linkedin: "#0A66C2",
  instagram: "#E4405F",
  facebook: "#1877F2",
  whatsapp: "#25D366",
  signal: "#3A76F0",
  website: "#6366F1",
} as const;

export type ContactSocialPlatform = keyof typeof CONTACT_SOCIAL_BRAND_COLORS;
