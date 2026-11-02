/**
 * Unified LinkedIn profile scraping orchestrator (SDUI + Voyager).
 */

import { extLog } from "../../../lib/log";
import { pollUntil } from "../pollUntil";
import type { EducationEntry } from "./education";
import { fetchFullEducation, fetchFullWorkHistory, fetchVoyagerProfileMeta } from "./fetchDetails";
import {
  beginVoyagerDump,
  finishVoyagerDump,
  isVoyagerDumpEnabled,
  type VoyagerCoverageRow,
} from "./fetchDetails/voyagerDump";
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

function keptPreferDom(dom?: string, voyager?: string): "dom" | "voyager" | "none" {
  if (dom) {
    return "dom";
  }
  if (voyager) {
    return "voyager";
  }
  return "none";
}

function keptText(dom?: string, voyager?: string): "dom" | "voyager" | "none" {
  if (voyager && dom) {
    return voyager.length >= dom.length ? "voyager" : "dom";
  }
  if (voyager) {
    return "voyager";
  }
  if (dom) {
    return "dom";
  }
  return "none";
}

function keptCount(voyagerCount: number, domCount: number): "voyager" | "dom" | "none" {
  if (voyagerCount > 0) {
    return "voyager";
  }
  if (domCount > 0) {
    return "dom";
  }
  return "none";
}

function setFlag(value: string | undefined): string {
  return value ? "set" : "";
}

function coverageRows(input: {
  domBio?: string;
  domEduCount: number;
  domIdentity: SduiIdentity | null;
  domWorkCount: number;
  keptBio?: string;
  usedHandleName: boolean;
  voyagerBio?: string;
  voyagerEduCount: number;
  voyagerIdentity: SduiIdentity | null;
  voyagerLocation?: string;
  voyagerWorkCount: number;
}): VoyagerCoverageRow[] {
  const dom = input.domIdentity;
  const voyager = input.voyagerIdentity;
  const nameKept = (field: "firstName" | "lastName"): string => {
    const side = keptPreferDom(dom?.[field], voyager?.[field]);
    if (side !== "none") {
      return side;
    }
    if (input.usedHandleName) {
      return "handle";
    }
    return "none";
  };

  return [
    {
      dom: String(input.domWorkCount),
      field: "work",
      kept: keptCount(input.voyagerWorkCount, input.domWorkCount),
      voyager: String(input.voyagerWorkCount),
    },
    {
      dom: String(input.domEduCount),
      field: "education",
      kept: keptCount(input.voyagerEduCount, input.domEduCount),
      voyager: String(input.voyagerEduCount),
    },
    {
      dom: input.domBio ? `${input.domBio.length}c` : "",
      field: "bio",
      kept: input.keptBio ? keptText(input.domBio, input.voyagerBio) : "none",
      voyager: input.voyagerBio ? `${input.voyagerBio.length}c` : "",
    },
    {
      dom: dom?.firstName ?? "",
      field: "firstName",
      kept: nameKept("firstName"),
      voyager: voyager?.firstName ?? "",
    },
    {
      dom: dom?.lastName ?? "",
      field: "lastName",
      kept: nameKept("lastName"),
      voyager: voyager?.lastName ?? "",
    },
    {
      dom: dom?.headline ?? "",
      field: "headline",
      kept: keptPreferDom(dom?.headline, voyager?.headline),
      voyager: voyager?.headline ?? "",
    },
    {
      dom: setFlag(dom?.profilePhotoUrl),
      field: "photo",
      kept: keptPreferDom(dom?.profilePhotoUrl, voyager?.profilePhotoUrl),
      voyager: setFlag(voyager?.profilePhotoUrl),
    },
    {
      dom: "",
      field: "location",
      kept: input.voyagerLocation ? "voyager" : "none",
      voyager: input.voyagerLocation ?? "",
    },
  ];
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
  if (!isVoyagerDumpEnabled()) {
    const cached = profileCache.get(handle);
    if (cached) {
      return cached;
    }
  }
  const inflight = inflightScrapes.get(handle);
  if (inflight) {
    return inflight;
  }

  const skipNetworkLogos = options?.skipNetworkLogos ?? false;

  const promise = (async () => {
    beginVoyagerDump(handle);
    let coverage: VoyagerCoverageRow[] = [];
    try {
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
      let domBio = extractSduiBio();
      let linkedinBio = pickLongerText(voyagerMeta.bio, domBio);
      if (!linkedinBio) {
        await pollUntil(
          () => Boolean(extractSduiBio()),
          5_000,
          () => {
            window.scrollTo(0, 480);
          },
        );
        domBio = extractSduiBio();
        linkedinBio = domBio;
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

      coverage = coverageRows({
        domBio,
        domEduCount: sduiEdu.length,
        domIdentity: sduiIdentity,
        domWorkCount: sduiWork.length,
        keptBio: linkedinBio,
        usedHandleName: Boolean(handleName),
        voyagerBio: voyagerMeta.bio,
        voyagerEduCount: fetchedEdu.length,
        voyagerIdentity: voyagerMeta.identity,
        voyagerLocation: voyagerMeta.location,
        voyagerWorkCount: fetchedWork.length,
      });

      return profile;
    } finally {
      finishVoyagerDump(handle, coverage);
    }
  })();

  inflightScrapes.set(handle, promise);
  try {
    return await promise;
  } finally {
    inflightScrapes.delete(handle);
  }
}
