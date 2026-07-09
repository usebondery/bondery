/**
 * Brand colors for contact social platform buttons (LinkedIn, Instagram, etc.).
 * Distinct from SOCIAL_LINKS in paths.ts which are Bondery's own social profiles.
 */
export const CONTACT_SOCIAL_BRAND_COLORS = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  signal: "#3A76F0",
  website: "#6366F1",
  whatsapp: "#25D366",
} as const;

export type ContactSocialPlatform = keyof typeof CONTACT_SOCIAL_BRAND_COLORS;
