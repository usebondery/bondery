/**
 * Unified LinkedIn profile scraping orchestrator (SDUI + Voyager).
 */

import { extLog } from "../../../lib/log";
import { pollUntil } from "../pollUntil";
import type { EducationEntry } from "./education";
import { fetchFullEducation, fetchFullWorkHistory, fetchVoyagerProfileMeta } from "./fetchDetails";
import {
  displayNameFromLinkedInHandle,
  ensureProfileSectionsLoaded,
  extractSduiBio,
  extractSduiEducation,
  extractSduiIdentity,
  extractSduiWorkHistory,
  getTopcard,
  type SduiIdentity,
} from "./sduiProfile";
import type { WorkEntry } from "./workExperience";

export interface CachedProfile {
  educationHistory: EducationEntry[];
  firstName?: string;
  headline?: string;
  lastName?: string;
  linkedinBio?: string;
  location?: string;
  middleName?: string;
  profilePhotoUrl?: string;
  workHistory: WorkEntry[];
}

export const profileCache = new Map<string, CachedProfile>();
const inflightScrapes = new Map<string, Promise<CachedProfile>>();

/** Only cache profiles that include history so a later scrape can recover empty Voyager. */
export function shouldCacheProfile(profile: CachedProfile): boolean {
  return profile.workHistory.length > 0 || profile.educationHistory.length > 0;
}

function mergeIdentities(
  sdui: SduiIdentity | null,
  voyager: SduiIdentity | null,
): SduiIdentity | null {
  if (!sdui && !voyager) {
    return null;
  }
  if (!sdui) {
    return voyager;
  }
  if (!voyager) {
    return sdui;
  }
  return {
    firstName: sdui.firstName,
    fullName: sdui.fullName,
    headline: sdui.headline ?? voyager.headline,
    lastName: sdui.lastName ?? voyager.lastName,
    middleName: sdui.middleName ?? voyager.middleName,
    profilePhotoUrl: sdui.profilePhotoUrl ?? voyager.profilePhotoUrl,
  };
}

function pickLongerText(a?: string, b?: string): string | undefined {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return a.length >= b.length ? a : b;
}

function applyCompanyDomLogos(entries: WorkEntry[], sdui: WorkEntry[]): WorkEntry[] {
  const byName = new Map<string, string>();
  for (const entry of sdui) {
    if (entry.companyLogoUrl && entry.companyName) {
      byName.set(entry.companyName.toLowerCase(), entry.companyLogoUrl);
    }
  }
  return entries.map((entry) => {
    if (entry.companyLogoUrl) {
      return entry;
    }
    const url = byName.get(entry.companyName.toLowerCase());
    return url ? { ...entry, companyLogoUrl: url } : entry;
  });
}

function applySchoolDomLogos(entries: EducationEntry[], sdui: EducationEntry[]): EducationEntry[] {
  const byName = new Map<string, string>();
  for (const entry of sdui) {
    if (entry.schoolLogoUrl && entry.schoolName) {
      byName.set(entry.schoolName.toLowerCase(), entry.schoolLogoUrl);
    }
  }
  return entries.map((entry) => {
    if (entry.schoolLogoUrl) {
      return entry;
    }
    const url = byName.get(entry.schoolName.toLowerCase());
    return url ? { ...entry, schoolLogoUrl: url } : entry;
  });
}

export async function scrapeLinkedInProfile(
  handle: string,
  options?: { skipNetworkLogos?: boolean },
): Promise<CachedProfile> {
  const cached = profileCache.get(handle);
  if (cached) {
    return cached;
  }
  const inflight = inflightScrapes.get(handle);
  if (inflight) {
    return inflight;
  }

  const skipNetworkLogos = options?.skipNetworkLogos ?? false;

  const promise = (async () => {
    const sectionsPromise = ensureProfileSectionsLoaded();

    const earlyDomWork = extractSduiWorkHistory();
    const domLogosByCompany = new Map<string, string>();
    for (const dw of earlyDomWork) {
      if (dw.companyLogoUrl && dw.companyName) {
        domLogosByCompany.set(dw.companyName.toLowerCase(), dw.companyLogoUrl);
      }
    }

    const earlyDomEdu = extractSduiEducation();
    const domLogosBySchool = new Map<string, string>();
    for (const de of earlyDomEdu) {
      if (de.schoolLogoUrl && de.schoolName) {
        domLogosBySchool.set(de.schoolName.toLowerCase(), de.schoolLogoUrl);
      }
    }

    const [workResult, eduResult, metaResult] = await Promise.allSettled([
      fetchFullWorkHistory(handle, domLogosByCompany, skipNetworkLogos),
      fetchFullEducation(handle, skipNetworkLogos, domLogosBySchool),
      fetchVoyagerProfileMeta(handle),
    ]);
    const fetchedWork = workResult.status === "fulfilled" ? workResult.value : [];
    const fetchedEdu = eduResult.status === "fulfilled" ? eduResult.value : [];
    const voyagerMeta =
      metaResult.status === "fulfilled"
        ? metaResult.value
        : { bio: undefined, identity: null, location: undefined };
    if (workResult.status === "rejected") {
      extLog.warn("[linkedin][scrape] work history fetch failed", workResult.reason);
    }
    if (eduResult.status === "rejected") {
      extLog.warn("[linkedin][scrape] education fetch failed", eduResult.reason);
    }
    if (metaResult.status === "rejected") {
      extLog.warn("[linkedin][scrape] profile meta fetch failed", metaResult.reason);
    }

    await sectionsPromise;

    const sduiIdentity = extractSduiIdentity(undefined, handle);
    const sduiWork = extractSduiWorkHistory();
    const sduiEdu = extractSduiEducation();
    const workHistory = applyCompanyDomLogos(
      fetchedWork.length > 0 ? fetchedWork : sduiWork,
      sduiWork,
    );
    const educationHistory = applySchoolDomLogos(
      fetchedEdu.length > 0 ? fetchedEdu : sduiEdu,
      sduiEdu,
    );
    const identity = mergeIdentities(sduiIdentity, voyagerMeta.identity);
    const handleName = identity ? null : displayNameFromLinkedInHandle(handle);
    let linkedinBio = pickLongerText(voyagerMeta.bio, extractSduiBio());
    if (!linkedinBio) {
      await pollUntil(
        () => Boolean(extractSduiBio()),
        5_000,
        () => {
          window.scrollTo(0, 480);
        },
      );
      linkedinBio = extractSduiBio();
    }

    const profile: CachedProfile = {
      educationHistory,
      firstName: identity?.firstName ?? handleName?.firstName,
      headline: identity?.headline,
      lastName: identity?.lastName ?? handleName?.lastName,
      linkedinBio,
      location: voyagerMeta.location,
      middleName: identity?.middleName ?? handleName?.middleName,
      profilePhotoUrl: identity?.profilePhotoUrl,
      workHistory,
    };

    extLog.debug(
      `[linkedin][scrape] ${handle}: ${workHistory.length} work (${fetchedWork.length > 0 ? "voyager" : "dom"}),` +
        ` ${educationHistory.length} edu (${fetchedEdu.length > 0 ? "voyager" : "dom"}),` +
        ` location=${voyagerMeta.location ? `"${voyagerMeta.location}"` : "none"}` +
        ` bio=${linkedinBio ? `${linkedinBio.length}c` : "none"}`,
    );

    if (workHistory.length === 0 && educationHistory.length === 0) {
      extLog.warn("[linkedin][scrape] empty work and education", {
        handle,
        hasIdentity: Boolean(identity),
        hasJsessionId: /(?:^|;\s*)JSESSIONID=/.test(document.cookie),
        hasTopcard: Boolean(getTopcard()),
        voyagerEduEmpty: fetchedEdu.length === 0,
        voyagerWorkEmpty: fetchedWork.length === 0,
      });
    }

    if (shouldCacheProfile(profile)) {
      profileCache.set(handle, profile);
    }

    return profile;
  })();

  inflightScrapes.set(handle, promise);
  try {
    return await promise;
  } finally {
    inflightScrapes.delete(handle);
  }
}
