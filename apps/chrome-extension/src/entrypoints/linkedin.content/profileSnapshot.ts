import { profileCache, scrapeLinkedInProfile } from "../../features/linkedin/scrape/scrapeProfile";
import { extractProfilePhotoUrl } from "../../features/linkedin/ui/LinkedInButton";
import { getLinkedInUsername } from "./username";

export async function getLinkedInSnapshot() {
  const username = getLinkedInUsername();
  if (!username) {
    return null;
  }

  const cached = profileCache.get(username);
  if (cached) {
    return {
      educationHistory: cached.educationHistory,
      firstName: cached.firstName,
      handle: username,
      headline: cached.headline,
      lastName: cached.lastName,
      linkedinBio: cached.linkedinBio,
      location: cached.location,
      middleName: cached.middleName,
      platform: "linkedin" as const,
      profileImageUrl: cached.profilePhotoUrl ?? extractProfilePhotoUrl() ?? undefined,
      workHistory: cached.workHistory,
    };
  }

  const profile = await scrapeLinkedInProfile(username);

  return {
    educationHistory: profile.educationHistory,
    firstName: profile.firstName,
    handle: username,
    headline: profile.headline,
    lastName: profile.lastName,
    linkedinBio: profile.linkedinBio,
    location: profile.location,
    middleName: profile.middleName,
    platform: "linkedin" as const,
    profileImageUrl: profile.profilePhotoUrl ?? extractProfilePhotoUrl() ?? undefined,
    workHistory: profile.workHistory,
  };
}
