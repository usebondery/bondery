/**
 * Education history fetching via Voyager dash API with school logo enrichment.
 */

import { extLog } from "../../../../lib/log";
import type { EducationEntry } from "../education";
import { extractLogoUrlFromVoyagerImage, fetchCompanyLogo } from "./voyagerLogos";
import {
  collectIncludedEntities,
  extractDates,
  extractLivePageJsonBlocks,
  extractProfileUrn,
  logEntityTypes,
  tryEndpoints,
  voyagerFetch,
} from "./voyagerShared";

/**
 * Resolves a school name from a schoolUrn or companyUrn via the Voyager API.
 * Returns the school name string or null if resolution fails.
 */
async function resolveSchoolName(edu: Record<string, unknown>): Promise<string | null> {
  // Try companyUrn first — schools are also company entities on LinkedIn
  const companyUrn = edu.companyUrn as string | undefined;
  if (companyUrn) {
    const companyId = companyUrn.split(":").pop();
    if (companyId) {
      // Fetch the company mini-profile which includes the name
      const data = await voyagerFetch(
        `/voyager/api/identity/dash/companies?q=universalName&universalName=${companyId}`,
      );
      if (data) {
        const included = (data.included ?? []) as Record<string, unknown>[];
        for (const item of included) {
          const name = (item.name ?? item.companyName) as string | undefined;
          if (name) {
            extLog.debug(`[linkedin][fetchDetails] Resolved school name from companyUrn: ${name}`);
            return name;
          }
        }
        // Check elements too
        const elements = ((data.data as Record<string, unknown> | undefined)?.elements ??
          data.elements) as Record<string, unknown>[] | undefined;
        if (elements) {
          for (const el of elements) {
            const name = (el.name ?? el.companyName) as string | undefined;
            if (name) {
              extLog.debug(
                `[linkedin][fetchDetails] Resolved school name from company elements: ${name}`,
              );
              return name;
            }
          }
        }
      }
    }
  }

  // Try schoolUrn with a simpler endpoint
  const schoolUrn = edu.schoolUrn as string | undefined;
  if (schoolUrn) {
    const schoolId = schoolUrn.split(":").pop();
    if (schoolId) {
      // Try fetching school as a company (schools are companies on LinkedIn)
      const data = await voyagerFetch(
        `/voyager/api/identity/dash/companies?q=universalName&universalName=${schoolId}`,
      );
      if (data) {
        const included = (data.included ?? []) as Record<string, unknown>[];
        for (const item of included) {
          const name = (item.name ?? item.schoolName ?? item.companyName) as string | undefined;
          if (name) {
            extLog.debug(
              `[linkedin][fetchDetails] Resolved school name from schoolUrn via companies: ${name}`,
            );
            return name;
          }
        }
      }
    }
  }

  return null;
}

async function mapEducationEntityAsync(
  edu: Record<string, unknown>,
): Promise<EducationEntry | null> {
  // schoolName can be null in dash API — fall back to multiLocaleSchoolName or schoolUrn
  const multiLocaleSchoolName = edu.multiLocaleSchoolName as
    | Record<string, string>
    | null
    | undefined;
  let schoolName = (edu.schoolName ??
    (multiLocaleSchoolName ? Object.values(multiLocaleSchoolName)[0] : null) ??
    (edu.school as Record<string, unknown>)?.name ??
    edu.subtitle ??
    "") as string;

  // If still no school name, try to resolve from schoolUrn
  if (!schoolName) {
    const resolved = await resolveSchoolName(edu);
    if (resolved) {
      schoolName = resolved;
    }
  }

  if (!schoolName) {
    return null;
  }

  const multiLocaleDegreeName = edu.multiLocaleDegreeName as
    | Record<string, string>
    | null
    | undefined;
  const degreeName = (edu.degreeName ??
    (multiLocaleDegreeName ? Object.values(multiLocaleDegreeName)[0] : null)) as string | undefined;
  const multiLocaleFieldOfStudy = edu.multiLocaleFieldOfStudy as
    | Record<string, string>
    | null
    | undefined;
  const fieldOfStudy = (edu.fieldOfStudy ??
    (multiLocaleFieldOfStudy ? Object.values(multiLocaleFieldOfStudy)[0] : null)) as
    | string
    | undefined;
  const degree = [degreeName, fieldOfStudy].filter(Boolean).join(", ") || undefined;
  const description = (edu.description ?? edu.activities) as string | undefined;
  const { startDate, endDate } = extractDates(edu);

  let schoolLinkedinId: string | undefined;
  const school = edu.school as Record<string, unknown> | undefined;
  const miniSchool = (school?.miniSchool ?? edu.miniSchool) as Record<string, unknown> | undefined;
  const schoolUniversalName = miniSchool?.universalName as string | undefined;
  if (schoolUniversalName) {
    schoolLinkedinId = schoolUniversalName;
  } else {
    // Prefer companyUrn / miniSchool.entityUrn over schoolUrn.
    // LinkedIn schools are also company entities; the fsd_company URN ID maps to
    // a /company/ URL that is reliably accessible, whereas urn:li:school IDs may
    // point to a different (sometimes inaccessible) /school/ namespace.
    const companyUrn = (edu.companyUrn ?? miniSchool?.entityUrn) as string | undefined;
    const schoolUrn = edu.schoolUrn as string | undefined;
    const urn = companyUrn ?? schoolUrn;
    if (urn) {
      schoolLinkedinId = urn.split(":").pop();
    }
  }

  // Try to extract school logo directly from the entity's embedded school/miniSchool objects.
  // LinkedIn API responses often include logo data in these sub-objects (same Voyager image structure
  // as company logos). This avoids extra network requests when the logo is already in the payload.
  let schoolLogoUrl: string | undefined;
  for (const obj of [miniSchool, school, edu].filter(Boolean) as Record<string, unknown>[]) {
    for (const key of ["logo", "companyLogo", "logoV2", "logoResolutionResult"]) {
      const logoData = obj[key] as Record<string, unknown> | undefined;
      if (logoData) {
        const url = extractLogoUrlFromVoyagerImage(logoData);
        if (url) {
          schoolLogoUrl = url;
          break;
        }
      }
    }
    if (schoolLogoUrl) {
      break;
    }
  }

  return {
    schoolLinkedinId,
    schoolName,
    ...(schoolLogoUrl ? { schoolLogoUrl } : {}),
    degree,
    description: description || undefined,
    endDate,
    startDate,
  };
}

/**
 * Enriches education entries with school logo URLs.
 *
 * Batch-fetches logos via the Voyager companies API for entries whose logo
 * was not embedded in the API response (i.e. `schoolLogoUrl` is still undefined).
 * Uses the same `fetchCompanyLogo` helper as work-entry enrichment so the
 * lookup strategy (universalName slug → entityUrn → numeric ID) is consistent.
 */
async function enrichEducationWithLogos(entries: EducationEntry[]): Promise<EducationEntry[]> {
  // Collect distinct IDs that still need logos (deduplicated)
  const seenIds = new Set<string>();
  const tasks: string[] = [];
  for (const entry of entries) {
    if (entry.schoolLogoUrl || !entry.schoolLinkedinId) {
      continue;
    }
    if (seenIds.has(entry.schoolLinkedinId)) {
      continue;
    }
    seenIds.add(entry.schoolLinkedinId);
    tasks.push(entry.schoolLinkedinId);
  }

  if (tasks.length === 0) {
    return entries;
  }

  extLog.debug(`[linkedin][fetchDetails] Fetching logos for ${tasks.length} school(s):`, tasks);

  const idToLogo = new Map<string, string>();
  await Promise.all(
    tasks.map(async (schoolId) => {
      try {
        const logoUrl = await fetchCompanyLogo(undefined, schoolId);
        if (logoUrl) {
          idToLogo.set(schoolId, logoUrl);
        }
      } catch {
        /* ignore individual logo fetch failures */
      }
    }),
  );

  return entries.map((entry) => {
    if (entry.schoolLogoUrl || !entry.schoolLinkedinId) {
      return entry;
    }
    const url = idToLogo.get(entry.schoolLinkedinId);
    return url ? { ...entry, schoolLogoUrl: url } : entry;
  });
}

/** Endpoints to try for education history (in priority order). */
const EDU_ENDPOINTS = (urn: string) => [
  `/voyager/api/identity/dash/profileEducations?q=viewee&profileUrn=${encodeURIComponent(urn)}&count=100`,
  `/voyager/api/identity/dash/profileEducations?q=viewee&profileUrn=${encodeURIComponent(urn)}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileEducation-3&count=100`,
];

/**
 * Fetches the full education history for a LinkedIn profile.
 *
 * Same strategy as work: API first (count=100) → live page fallback → [].
 */
export async function fetchFullEducation(username: string): Promise<EducationEntry[]> {
  // ── Step 1: Mine live page for the profileUrn and any embedded entities ──
  const blocks = extractLivePageJsonBlocks();
  const entities = collectIncludedEntities(blocks);

  const profileUrn = extractProfileUrn(entities, username);

  // ── Step 2: Try dash API (authoritative — requests up to 100 entries) ──
  if (profileUrn) {
    const data = await tryEndpoints(EDU_ENDPOINTS(profileUrn));

    if (data) {
      const apiEntities = collectIncludedEntities([data]);
      logEntityTypes(apiEntities, "education API");

      const apiEducation = apiEntities.filter((e) => {
        const t = e.$type as string | undefined;
        return (
          t != null &&
          (/education/i.test(t) || /school/i.test(t)) &&
          !/collection/i.test(t) &&
          !/setting/i.test(t)
        );
      });

      extLog.debug(`[linkedin][fetchDetails] API education entities: ${apiEducation.length}`);
      if (apiEducation.length > 0) {
        extLog.debug(
          `[linkedin][fetchDetails] Sample education (API):`,
          JSON.stringify(apiEducation[0], null, 2),
        );
      }

      const entries = (await Promise.all(apiEducation.map(mapEducationEntityAsync))).filter(
        (e): e is EducationEntry => e !== null,
      );

      if (entries.length > 0) {
        extLog.debug(
          `[linkedin][fetchDetails] Parsed ${entries.length} education entries from API`,
          entries.map((e) => `${e.schoolName} — ${e.degree ?? "(no degree)"}`),
        );
        return enrichEducationWithLogos(entries);
      }
    } else {
      extLog.warn(`[linkedin][fetchDetails] All education API endpoints failed for ${username}`);
    }
  } else {
    extLog.warn(`[linkedin][fetchDetails] No profileUrn — cannot call dash API for education`);
  }

  // ── Step 3: Fall back to live page education entities ──
  const educationEntities = entities.filter((e) => {
    const t = e.$type as string | undefined;
    return (
      t != null &&
      (/education/i.test(t) || /school/i.test(t)) &&
      !/collection/i.test(t) &&
      !/setting/i.test(t)
    );
  });

  extLog.debug(
    `[linkedin][fetchDetails] Live page education entities (fallback): ${educationEntities.length}`,
  );

  if (educationEntities.length > 0) {
    extLog.debug(
      `[linkedin][fetchDetails] Sample education (live):`,
      JSON.stringify(educationEntities[0], null, 2),
    );

    const entries = (await Promise.all(educationEntities.map(mapEducationEntityAsync))).filter(
      (e): e is EducationEntry => e !== null,
    );

    if (entries.length > 0) {
      extLog.debug(
        `[linkedin][fetchDetails] Parsed ${entries.length} education entries from live page (fallback)`,
        entries.map((e) => `${e.schoolName} — ${e.degree ?? "(no degree)"}`),
      );
      return enrichEducationWithLogos(entries);
    }
  }

  extLog.warn(`[linkedin][fetchDetails] All education history sources failed for ${username}`);
  return [];
}
