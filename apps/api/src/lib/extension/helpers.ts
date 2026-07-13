import type { SocialPlatform } from "../contacts/socials.js";

export function resolvePrimarySocial(payload: {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
}): { platform: SocialPlatform; handle: string } | null {
  if (payload.instagram?.trim()) {
    return { handle: payload.instagram.trim(), platform: "instagram" };
  }

  if (payload.linkedin?.trim()) {
    return { handle: payload.linkedin.trim(), platform: "linkedin" };
  }

  if (payload.facebook?.trim()) {
    return { handle: payload.facebook.trim(), platform: "facebook" };
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
