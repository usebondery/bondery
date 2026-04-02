/**
 * Extension route shared schemas and helper functions
 */

import { Type } from "@sinclair/typebox";
import type { SocialPlatform } from "../../lib/socials.js";
import {
  ScrapedWorkHistoryEntrySchema,
  ScrapedEducationEntrySchema,
  NullableString,
} from "../../lib/schemas.js";

export const RedirectBody = Type.Object({
  instagram: Type.Optional(Type.String()),
  linkedin: Type.Optional(Type.String()),
  facebook: Type.Optional(Type.String()),
  firstName: Type.Optional(Type.String()),
  middleName: Type.Optional(NullableString),
  lastName: Type.Optional(NullableString),
  profileImageUrl: Type.Optional(NullableString),
  headline: Type.Optional(NullableString),
  location: Type.Optional(NullableString),
  notes: Type.Optional(NullableString),
  linkedinBio: Type.Optional(NullableString),
  workHistory: Type.Optional(Type.Array(ScrapedWorkHistoryEntrySchema)),
  educationHistory: Type.Optional(Type.Array(ScrapedEducationEntrySchema)),
});

export const RedirectQuery = Type.Object({
  instagram: Type.Optional(Type.String()),
  linkedin: Type.Optional(Type.String()),
  facebook: Type.Optional(Type.String()),
  firstName: Type.Optional(Type.String()),
  middleName: Type.Optional(Type.String()),
  lastName: Type.Optional(Type.String()),
  profileImageUrl: Type.Optional(Type.String()),
  headline: Type.Optional(Type.String()),
  location: Type.Optional(Type.String()),
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
