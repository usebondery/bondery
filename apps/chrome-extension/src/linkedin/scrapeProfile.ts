/**
 * Unified LinkedIn profile scraping orchestrator (SDUI + Voyager).
 */

import type { EducationEntry } from "./education";
import { fetchFullEducation, fetchFullWorkHistory, fetchProfileLocation } from "./fetchDetails";
import {
  ensureProfileSectionsLoaded,
  extractSduiBio,
  extractSduiEducation,
  extractSduiIdentity,
  extractSduiWorkHistory,
} from "./sduiProfile";
import type { WorkEntry } from "./workExperience";

export interface CachedProfile {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  headline?: string;
  location?: string;
  workHistory: WorkEntry[];
  educationHistory: EducationEntry[];
  linkedinBio?: string;
}

export const profileCache = new Map<string, CachedProfile>();
const inflightScrapes = new Map<string, Promise<CachedProfile>>();

export interface ScrapeProfileOptions {
  /** Skip scroll/wait for lazy DOM sections — Voyager is primary (background enrich tabs). */
  skipLazySectionScroll?: boolean;
}

function shouldCacheProfile(handle: string, profile: CachedProfile): boolean {
  if (profile.workHistory.length > 0 || profile.educationHistory.length > 0) return true;
  const name = profile.firstName?.trim();
  return !!name && name.toLowerCase() !== handle.toLowerCase();
}

export async function scrapeLinkedInProfile(
  handle: string,
  options?: ScrapeProfileOptions,
): Promise<CachedProfile> {
  const cacheKey = options?.skipLazySectionScroll ? `${handle}:enrich` : handle;
  if (profileCache.has(cacheKey)) {
    return profileCache.get(cacheKey)!;
  }
  if (inflightScrapes.has(cacheKey)) {
    return inflightScrapes.get(cacheKey)!;
  }

  const promise = (async () => {
    if (!options?.skipLazySectionScroll) {
      await ensureProfileSectionsLoaded();
    }

    const identity = extractSduiIdentity();
    const linkedinBio = extractSduiBio();

    const domWork = extractSduiWorkHistory();
    const domLogosByCompany = new Map<string, string>();
    for (const dw of domWork) {
      if (dw.companyLogoUrl && dw.companyName) {
        domLogosByCompany.set(dw.companyName.toLowerCase(), dw.companyLogoUrl);
      }
    }

    const [fetchedWork, fetchedEdu, voyagerLocation] = await Promise.all([
      fetchFullWorkHistory(handle, domLogosByCompany),
      fetchFullEducation(handle),
      fetchProfileLocation(handle),
    ]);

    const workHistory = fetchedWork.length > 0 ? fetchedWork : domWork;
    const educationHistory = fetchedEdu.length > 0 ? fetchedEdu : extractSduiEducation();

    const cached: CachedProfile = {
      firstName: identity?.firstName ?? handle,
      middleName: identity?.middleName,
      lastName: identity?.lastName,
      profilePhotoUrl: identity?.profilePhotoUrl,
      headline: identity?.headline,
      location: voyagerLocation,
      workHistory,
      educationHistory,
      linkedinBio,
    };

    console.log(
      `[linkedin][scrape] ${handle}: ${workHistory.length} work (${fetchedWork.length > 0 ? "voyager" : "dom"}),` +
        ` ${educationHistory.length} edu (${fetchedEdu.length > 0 ? "voyager" : "dom"}),` +
        ` location=${voyagerLocation ? `"${voyagerLocation}"` : "none"}`,
    );

    if (shouldCacheProfile(handle, cached)) {
      profileCache.set(cacheKey, cached);
    }

    return cached;
  })();

  inflightScrapes.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflightScrapes.delete(cacheKey);
  }
}
