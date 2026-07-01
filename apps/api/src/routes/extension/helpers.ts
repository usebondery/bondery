/**
 * Extension route shared schemas and helper functions
 */

import type { SocialPlatform } from "../../lib/socials";
import { redirectRequestSchema } from "@bondery/schemas";
import { z } from "zod";

export const redirectBodySchema = redirectRequestSchema;

export const redirectQuerySchema = z.object({
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
});

export function resolvePrimarySocial(payload: {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
}): { platform: SocialPlatform; handle: string } | null {
  if (payload.instagram?.trim()) {
    return { platform: "instagram", handle: payload.instagram.trim() };
  }

  if (payload.linkedin?.trim()) {
    return { platform: "linkedin", handle: payload.linkedin.trim() };
  }

  if (payload.facebook?.trim()) {
    return { platform: "facebook", handle: payload.facebook.trim() };
  }

  return null;
}

export function resolveExtensionDefaultGroup(platform: SocialPlatform) {
  if (platform === "linkedin") {
    return "extension_linkedin" as const;
  }

  if (platform === "instagram") {
    return "extension_instagram" as const;
  }

  return null;
}
