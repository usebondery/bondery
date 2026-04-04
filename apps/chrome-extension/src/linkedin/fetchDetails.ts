/**
 * LinkedIn Full History Fetcher
 *
 * Strategy (in order):
 * 1. Mine the LIVE page's embedded `<code>` blocks for Voyager data
 *    (LinkedIn embeds full API responses there even though the UI only renders ~5)
 * 2. Fall back to the `dash` Voyager REST API endpoints with CSRF auth
 * 3. Return [] so the caller falls back to live-DOM scraping
 *
 * The content script runs on linkedin.com, so both approaches have full
 * cookie / same-origin access.
 */

import type { WorkEntry } from "./workExperience";
import type { EducationEntry } from "./education";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoyagerTimePeriod {
  startDate?: { month?: number; year?: number };
  endDate?: { month?: number; year?: number };
}

interface VoyagerDateRange {
  start?: { month?: number; year?: number };
  end?: { month?: number; year?: number };
}

/**
 * Normalises a Voyager date structure — handles both:
 *   timePeriod: { startDate: { year, month }, endDate: … }  (old format)
 *   dateRange:  { start:     { year, month }, end: … }      (dash format)
 */
function extractDates(entity: Record<string, unknown>): { startDate?: string; endDate?: string } {
  const tp = entity.timePeriod as VoyagerTimePeriod | undefined;
  const dr = entity.dateRange as VoyagerDateRange | undefined;

  const start = tp?.startDate ?? dr?.start;
  const end = tp?.endDate ?? dr?.end;

  return {
    startDate: formatVoyagerDate(start),
    endDate: formatVoyagerDate(end),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps Voyager employment type URN keys to human-readable labels.
 * LinkedIn uses both named keys (FULL_TIME) and numeric IDs (12) depending on
 * the API version/endpoint. Both are mapped here.
 */
const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  // Named variants from older Voyager endpoints
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  SELF_EMPLOYED: "Self-employed",
  FREELANCE: "Freelance",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  APPRENTICESHIP: "Apprenticeship",
  SEASONAL: "Seasonal",
  VOLUNTEER: "Volunteer",
  TEMPORARY: "Temporary",
};

/**
 * Resolves an employment type URN to a human-readable label using
 * the named-variant fallback table.
 *
 * The primary resolution path is the fsd_employmentType entity map built
 * from the API response's `included` array (see extractPositionsFromApiResponse).
 * This fallback only applies when no such entity is included.
 *
 * Returns undefined for unrecognised numeric IDs.
 */
function resolveEmploymentType(urn: string, entityMap?: Map<string, string>): string | undefined {
  // Primary: look up the full URN in the entity map (fsd_employmentType entities)
  if (entityMap) {
    const fromEntity = entityMap.get(urn);
    if (fromEntity) return fromEntity;
  }
  // Fallback: named enum key
  const key = urn.split(":").pop() ?? "";
  const label = EMPLOYMENT_TYPE_LABELS[key] ?? EMPLOYMENT_TYPE_LABELS[key.toUpperCase()];
  if (label) return label;
  // Don't surface raw numeric IDs — the entity was not included in this response
  if (/^\d+$/.test(key)) return undefined;
  return key.replace(/-/g, " ");
}

function formatVoyagerDate(d?: { month?: number; year?: number }): string | undefined {
  if (!d?.year) return undefined;
  if (d.month) return `${d.year}-${String(d.month).padStart(2, "0")}`;
  return String(d.year);
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
  return match?.[1] ?? null;
}

// ─── 1. Mine embedded <code> blocks from the LIVE page ──────────────────────

/**
 * Extracts all JSON objects from `<code>` elements in the live document.
 * LinkedIn wraps Voyager data in `<!--{JSON}-->` inside hidden <code> tags.
 */
function extractLivePageJsonBlocks(): unknown[] {
  const codeElements = document.querySelectorAll("code");
  const blocks: unknown[] = [];

  for (const code of codeElements) {
    const raw = code.innerHTML?.trim();
    if (!raw) continue;

    // LinkedIn wraps JSON in HTML comments: <!--{...}-->
    const commentMatch = raw.match(/^<!--(.+)-->$/s);
    const jsonStr = commentMatch ? commentMatch[1] : raw;

    try {
      const parsed = JSON.parse(jsonStr);
      blocks.push(parsed);
    } catch {
      // Not valid JSON — skip
    }
  }

  console.log(`[linkedin][fetchDetails] Live page: found ${blocks.length} JSON <code> blocks`);
  return blocks;
}

/**
 * Collects all objects in `included` arrays across all JSON blocks.
 */
function collectIncludedEntities(blocks: unknown[]): Record<string, unknown>[] {
  const entities: Record<string, unknown>[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const obj = block as Record<string, unknown>;
    if (Array.isArray(obj.included)) {
      for (const item of obj.included) {
        if (item && typeof item === "object") {
          entities.push(item as Record<string, unknown>);
        }
      }
    }
  }
  return entities;
}

/**
 * Logs all unique $type values found in entities (for debugging).
 */
function logEntityTypes(entities: Record<string, unknown>[], label: string): void {
  const types = new Set<string>();
  for (const e of entities) {
    const t = e["$type"] as string | undefined;
    if (t) types.add(t);
  }
  console.log(
    `[linkedin][fetchDetails] ${label} — ${entities.length} entities, ${types.size} types:`,
    [...types],
  );
}

// ─── 2. Voyager dash API caller ─────────────────────────────────────────────

async function voyagerFetch(path: string): Promise<Record<string, unknown> | null> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    console.warn("[linkedin][fetchDetails] No JSESSIONID cookie — cannot call Voyager API");
    return null;
  }

  const url = `https://www.linkedin.com${path}`;
  console.log(`[linkedin][fetchDetails] Voyager API: ${url}`);

  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "csrf-token": csrfToken,
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "x-restli-protocol-version": "2.0.0",
      },
    });

    if (!response.ok) {
      console.warn(`[linkedin][fetchDetails] Voyager ${response.status} for ${path}`);
      return null;
    }

    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.warn(`[linkedin][fetchDetails] Voyager error for ${path}:`, error);
    return null;
  }
}

/**
 * Extracts the fsd_profile URN for the VIEWED profile (not the logged-in user).
 * Matches on `publicIdentifier === username` to avoid picking up the viewer's own data.
 */
function extractProfileUrn(entities: Record<string, unknown>[], username: string): string | null {
  console.log(
    `[linkedin][fetchDetails] Looking for profileUrn for "${username}" among ${entities.length} entities`,
  );

  // Normalise to NFC so diacritical-mark profiles (e.g. "antonín-müller-…")
  // match even when the URL was decoded to NFD combining characters.
  const normalizedUsername = username.normalize("NFC");

  // 1. Find the Profile / MiniProfile entity whose publicIdentifier matches the viewed user
  for (const e of entities) {
    const pubId = (e.publicIdentifier ?? e.vanityName) as string | undefined;
    if (pubId?.normalize("NFC") === normalizedUsername) {
      const urn = (e.entityUrn ?? e.objectUrn ?? e.dashEntityUrn ?? e["*profile"]) as
        | string
        | undefined;
      if (urn && typeof urn === "string") {
        // Normalise to fsd_profile URN
        if (urn.startsWith("urn:li:fsd_profile:")) {
          console.log(`[linkedin][fetchDetails] Matched profileUrn: ${urn} (pubId=${pubId})`);
          return urn;
        }
        const idMatch = urn.match(/:([A-Za-z0-9_-]+)$/);
        if (idMatch) {
          const fsdUrn = `urn:li:fsd_profile:${idMatch[1]}`;
          console.log(
            `[linkedin][fetchDetails] Derived profileUrn: ${fsdUrn} from ${urn} (pubId=${pubId})`,
          );
          return fsdUrn;
        }
      }
    }
  }

  // 2. Sliding-window search of the raw page HTML.
  //    The old regex used [^}]* which silently fails when nested JSON objects
  //    appear between publicIdentifier and entityUrn. Instead, we locate every
  //    occurrence of the username string and scan a ±1500-char window for an
  //    fsd_profile URN — nested braces are no longer an obstacle.
  const pageHtml = document.documentElement.innerHTML;
  const usernameToken = `"${username}"`;
  let idx = pageHtml.indexOf(usernameToken);
  while (idx !== -1) {
    const windowStart = Math.max(0, idx - 1000);
    const windowEnd = Math.min(pageHtml.length, idx + usernameToken.length + 1000);
    const slice = pageHtml.slice(windowStart, windowEnd);
    const urnMatch = slice.match(/urn:li:fsd_profile:[A-Za-z0-9_-]+/);
    if (urnMatch) {
      console.log(
        `[linkedin][fetchDetails] Found profileUrn via sliding-window HTML search: ${urnMatch[0]}`,
      );
      return urnMatch[0];
    }
    idx = pageHtml.indexOf(usernameToken, idx + 1);
  }

  // 3. DOM fallback: section[data-member-id] gives the numeric member ID.
  //    Search for any co-located fsd_profile URN in a window around it.
  const memberSection = document.querySelector("section[data-member-id]");
  const memberId = memberSection?.getAttribute("data-member-id");
  if (memberId) {
    const memberToken = `"${memberId}"`;
    let mIdx = pageHtml.indexOf(memberToken);
    while (mIdx !== -1) {
      const windowStart = Math.max(0, mIdx - 500);
      const windowEnd = Math.min(pageHtml.length, mIdx + memberToken.length + 500);
      const slice = pageHtml.slice(windowStart, windowEnd);
      const urnMatch = slice.match(/urn:li:fsd_profile:[A-Za-z0-9_-]+/);
      if (urnMatch) {
        console.log(
          `[linkedin][fetchDetails] Found profileUrn via memberId sliding-window: ${urnMatch[0]}`,
        );
        return urnMatch[0];
      }
      mIdx = pageHtml.indexOf(memberToken, mIdx + 1);
    }
  }

  console.warn(`[linkedin][fetchDetails] Could not find profileUrn for ${username}`);
  return null;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapPositionEntity(
  pos: Record<string, unknown>,
  employmentTypeByUrn?: Map<string, string>,
): WorkEntry | null {
  const title = (pos.title ?? "") as string;
  const companyName = (pos.companyName ?? pos.subtitle ?? "") as string;
  if (!title && !companyName) return null;

  const { startDate, endDate } = extractDates(pos);
  const locationName = (pos.locationName ?? pos.geoLocationName ?? pos.caption) as
    | string
    | undefined;
  const description = (pos.description ?? "") as string | undefined;

  // Employment type: resolve via the entity map first, then named fallback
  const empTypeUrn = pos.employmentTypeUrn as string | undefined;
  if (empTypeUrn) {
    console.log(`[linkedin][fetchDetails] Raw employmentTypeUrn: ${empTypeUrn}`);
  }
  const employmentType = empTypeUrn
    ? resolveEmploymentType(empTypeUrn, employmentTypeByUrn)
    : undefined;

  // Company LinkedIn identifier — try various Voyager patterns
  let companyLinkedinId: string | undefined;
  const company = pos.company as Record<string, unknown> | undefined;
  const miniCompany = (company?.miniCompany ?? pos.miniCompany) as
    | Record<string, unknown>
    | undefined;
  const universalName = miniCompany?.universalName as string | undefined;
  if (universalName) {
    companyLinkedinId = universalName;
  } else {
    // Fall back to companyUrn → extract numeric ID
    const companyUrn = pos.companyUrn as string | undefined;
    if (companyUrn) {
      companyLinkedinId = companyUrn.split(":").pop();
    }
  }

  // Company logo — try nested logo / vectorImage structures
  let companyLogoUrl: string | undefined;
  const logo = (company?.logo ?? miniCompany?.logo ?? pos.companyLogo) as
    | Record<string, unknown>
    | undefined;
  if (logo) {
    companyLogoUrl = extractLogoUrlFromVoyagerImage(logo);
  }

  // Preserve companyUrn so we can batch-fetch logos later.
  // LinkedIn sometimes uses *company (a star-prefixed URN reference) instead of companyUrn.
  const companyUrn = (pos.companyUrn ?? pos["*company"]) as string | undefined;

  return {
    title,
    companyName,
    ...(companyLinkedinId ? { companyLinkedinId } : {}),
    ...(companyLogoUrl ? { companyLogoUrl } : {}),
    ...(companyUrn ? { companyUrn } : {}),
    startDate,
    endDate,
    ...(employmentType ? { employmentType } : {}),
    location: locationName ?? undefined,
    description: description || undefined,
  };
}

/**
 * Extracts a displayable image URL from various Voyager logo/image structures.
 *
 * LinkedIn nests logos in many patterns, e.g.:
 *   { rootUrl, artifacts }                        (direct)
 *   { image: { rootUrl, artifacts } }              (vectorImage wrapper)
 *   { image: { "com.linkedin.common.VectorImage": { rootUrl, artifacts } } }
 *   { logoResolutionResult: { vectorImage: { rootUrl, artifacts } } }
 *
 * Instead of handling each level explicitly we recurse into nested objects
 * (max depth 5) looking for the rootUrl + artifacts pattern.
 */
function extractLogoUrlFromVoyagerImage(
  img: Record<string, unknown>,
  depth = 0,
): string | undefined {
  if (depth > 5) return undefined;

  // Direct rootUrl + artifacts
  const rootUrl = img.rootUrl as string | undefined;
  const artifacts = img.artifacts as { fileIdentifyingUrlPathSegment?: string }[] | undefined;
  if (rootUrl && artifacts?.length) {
    const largest = artifacts[artifacts.length - 1];
    if (largest?.fileIdentifyingUrlPathSegment) {
      return `${rootUrl}${largest.fileIdentifyingUrlPathSegment}`;
    }
  }

  // Direct url field
  const url = img.url as string | undefined;
  if (url && url.startsWith("http")) return url;

  // Recurse into nested objects (handles image, vectorImage,
  // com.linkedin.common.VectorImage, logoResolutionResult, etc.)
  for (const value of Object.values(img)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const result = extractLogoUrlFromVoyagerImage(value as Record<string, unknown>, depth + 1);
      if (result) return result;
    }
  }

  return undefined;
}

/** Checks a single entity object for any recognised logo key. */
function extractLogoFromEntity(entity: Record<string, unknown>): string | undefined {
  for (const key of ["logo", "companyLogo", "logoV2", "logoResolutionResult"]) {
    const logo = entity[key] as Record<string, unknown> | undefined;
    if (logo) {
      const url = extractLogoUrlFromVoyagerImage(logo);
      if (url) return url;
    }
  }
  return undefined;
}

/**
 * Extracts a logo URL from a raw Voyager companies API response object.
 * Checks included entities, elements arrays, and single-entity response shapes.
 */
function extractLogoFromCompanyResponse(data: Record<string, unknown>): string | undefined {
  // Check included entities
  for (const item of (data.included ?? []) as Record<string, unknown>[]) {
    const url = extractLogoFromEntity(item);
    if (url) return url;
  }

  // Check elements array (handles { elements: [...] } or { data: { elements: [...] } })
  const elements = ((data.data as Record<string, unknown> | undefined)?.elements ??
    data.elements) as Record<string, unknown>[] | undefined;
  if (elements) {
    for (const el of elements) {
      const url = extractLogoFromEntity(el);
      if (url) return url;
    }
  }

  // Check data.data as a single entity (e.g. q=entityUrn single result)
  const dataData = data.data as Record<string, unknown> | undefined;
  if (dataData && typeof dataData === "object" && !Array.isArray(dataData)) {
    const url = extractLogoFromEntity(dataData);
    if (url) return url;
  }

  // Check data itself as a single entity (e.g. direct /companies/{id} response)
  return extractLogoFromEntity(data);
}

/**
 * Fetches the company logo URL for a given Voyager company.
 *
 * Tries strategies in order, stopping at the first hit:
 *  1. `q=universalName` — when a non-numeric slug is available (e.g. "rohlik-group").
 *  2. `q=entityUrn`     — direct URN lookup; works for both slugs and numeric IDs.
 *  3. Direct ID lookup  — `/organization/companies/{numericId}` when URN contains a numeric ID.
 *
 * Either `companyUrn` or `universalName` must be provided; both may be supplied.
 *
 * @param companyUrn    e.g. "urn:li:fsd_company:960796" — may be undefined when only a slug is known.
 * @param universalName Optional company slug (e.g. "rohlik-group" or "960796").
 * @returns The logo URL or undefined if not found.
 */
async function fetchCompanyLogo(
  companyUrn: string | undefined,
  universalName?: string,
): Promise<string | undefined> {
  // Strategy 1: query by universalName slug (only when the value is not purely numeric)
  if (universalName && !/^\d+$/.test(universalName)) {
    const data = await voyagerFetch(
      `/voyager/api/identity/dash/companies?q=universalName&universalName=${encodeURIComponent(universalName)}`,
    );
    if (data) {
      const url = extractLogoFromCompanyResponse(data);
      if (url) return url;
    }
  }

  // Strategy 2: query by entity URN (requires a URN)
  if (companyUrn) {
    const data = await voyagerFetch(
      `/voyager/api/identity/dash/companies?q=entityUrn&entityUrn=${encodeURIComponent(companyUrn)}`,
    );
    if (data) {
      const url = extractLogoFromCompanyResponse(data);
      if (url) return url;
    }
  }

  // Strategy 3: Direct company ID lookup via classic organization API (single-entity response)
  // Extract numeric ID from URN (e.g. "urn:li:fsd_company:960796" → "960796")
  // or from a purely numeric universalName.
  const numericId =
    companyUrn?.split(":").pop() ??
    (universalName && /^\d+$/.test(universalName) ? universalName : undefined);
  if (numericId && /^\d+$/.test(numericId)) {
    const data = await voyagerFetch(`/voyager/api/organization/companies/${numericId}`);
    if (data) {
      const url = extractLogoFromCompanyResponse(data);
      if (url) return url;
    }
  }

  return undefined;
}

/**
 * Builds a companyUrn → logoUrl map from the `included` entities
 * of a Voyager API response. Company entities sit alongside position entities
 * in the same response, so we can extract logos without extra network requests.
 */
function extractCompanyLogosFromIncluded(entities: Record<string, unknown>[]): Map<string, string> {
  const logoMap = new Map<string, string>();
  const companyEntities = entities.filter((e) => {
    const urn = e.entityUrn as string | undefined;
    return urn?.includes("fsd_company");
  });
  for (const entity of companyEntities) {
    const urn = entity.entityUrn as string | undefined;
    if (!urn) continue;
    for (const key of ["logo", "companyLogo", "logoV2", "logoResolutionResult"]) {
      const logo = entity[key] as Record<string, unknown> | undefined;
      if (logo) {
        const url = extractLogoUrlFromVoyagerImage(logo);
        if (url) {
          logoMap.set(urn, url);
          break;
        }
      }
    }
  }

  return logoMap;
}

/**
 * Enriches work entries with company logo URLs.
 *
 * 1. Applies `domLogos` (cheap DOM scrape, keyed by lowercase company name) — no network cost.
 * 2. Mines logos from the API response's `included` entities — no extra requests.
 * 3. Falls back to batch-fetching company data for any remaining entries that have
 *    either a `companyUrn` OR a `companyLinkedinId` (slug/numeric-id).
 *
 * @param entries           Work entries (may include companyUrn from mapPositionEntity).
 * @param includedEntities  The full `included` entities from the Voyager API response.
 * @param domLogos          Optional pre-scraped logos from the live DOM (company name → url).
 * @returns Entries with companyLogoUrl populated where possible.
 */
async function enrichEntriesWithLogos(
  entries: WorkEntry[],
  includedEntities?: Record<string, unknown>[],
  domLogos?: Map<string, string>,
): Promise<WorkEntry[]> {
  // Step 0: Apply DOM logos (free — already scraped synchronously by the caller)
  if (domLogos && domLogos.size > 0) {
    entries = entries.map((entry) => {
      if (entry.companyLogoUrl) return entry;
      const url = domLogos.get(entry.companyName.toLowerCase());
      return url ? { ...entry, companyLogoUrl: url } : entry;
    });
  }
  // Step 1: Mine logos from the included entities (free — already in memory)
  const includedLogos = includedEntities
    ? extractCompanyLogosFromIncluded(includedEntities)
    : new Map<string, string>();

  // Apply included logos (keyed by companyUrn)
  entries = entries.map((entry) => {
    if (entry.companyLogoUrl || !entry.companyUrn) return entry;
    const logoUrl = includedLogos.get(entry.companyUrn);
    return logoUrl ? { ...entry, companyLogoUrl: logoUrl } : entry;
  });

  // Step 2: Batch-fetch logos for entries still missing one.
  // Use a stable lookup key: prefer companyUrn, fall back to "id:<linkedInId>".
  // This handles entries where LinkedIn returned a *company URN-reference that
  // we couldn't resolve into companyUrn, or where only a universalName slug is known.
  type FetchTask = { key: string; urn: string | undefined; linkedInId: string | undefined };
  const tasks: FetchTask[] = [];
  const seenKeys = new Set<string>();

  for (const entry of entries) {
    if (entry.companyLogoUrl) continue;
    const key =
      entry.companyUrn ?? (entry.companyLinkedinId ? `id:${entry.companyLinkedinId}` : null);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    tasks.push({ key, urn: entry.companyUrn, linkedInId: entry.companyLinkedinId });
  }

  if (tasks.length === 0) return entries;

  // Fetch logos in parallel
  const keyToLogo = new Map<string, string>();
  await Promise.all(
    tasks.map(async ({ key, urn, linkedInId }) => {
      try {
        const logoUrl = await fetchCompanyLogo(urn, linkedInId);
        if (logoUrl) keyToLogo.set(key, logoUrl);
      } catch {
        /* ignore individual logo fetch failures */
      }
    }),
  );

  // Merge logos back into entries using the same key derivation logic
  const result = entries.map((entry) => {
    if (entry.companyLogoUrl) return entry;
    const key =
      entry.companyUrn ?? (entry.companyLinkedinId ? `id:${entry.companyLinkedinId}` : null);
    if (!key) return entry;
    const logoUrl = keyToLogo.get(key);
    return logoUrl ? { ...entry, companyLogoUrl: logoUrl } : entry;
  });

  return result;
}

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
            console.log(`[linkedin][fetchDetails] Resolved school name from companyUrn: ${name}`);
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
              console.log(
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
            console.log(
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
    if (resolved) schoolName = resolved;
  }

  if (!schoolName) return null;

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
    if (schoolLogoUrl) break;
  }

  return {
    schoolName,
    schoolLinkedinId,
    ...(schoolLogoUrl ? { schoolLogoUrl } : {}),
    degree,
    description: description || undefined,
    startDate,
    endDate,
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
    if (entry.schoolLogoUrl || !entry.schoolLinkedinId) continue;
    if (seenIds.has(entry.schoolLinkedinId)) continue;
    seenIds.add(entry.schoolLinkedinId);
    tasks.push(entry.schoolLinkedinId);
  }

  if (tasks.length === 0) return entries;

  console.log(`[linkedin][fetchDetails] Fetching logos for ${tasks.length} school(s):`, tasks);

  const idToLogo = new Map<string, string>();
  await Promise.all(
    tasks.map(async (schoolId) => {
      try {
        const logoUrl = await fetchCompanyLogo(undefined, schoolId);
        if (logoUrl) idToLogo.set(schoolId, logoUrl);
      } catch {
        /* ignore individual logo fetch failures */
      }
    }),
  );

  return entries.map((entry) => {
    if (entry.schoolLogoUrl || !entry.schoolLinkedinId) return entry;
    const url = idToLogo.get(entry.schoolLinkedinId);
    return url ? { ...entry, schoolLogoUrl: url } : entry;
  });
}

// ─── PositionGroup → flat positions extractor ──────────────────────────────

/**
 * LinkedIn's dash API returns `PositionGroup` entities, where each group
 * represents a company and contains nested positions. This function:
 *
 * 1. Looks for individual Position entities (if LinkedIn includes them)
 * 2. Falls back to extracting positions from PositionGroup wrappers
 * 3. Uses `data.elements` → `profilePositionInPositionGroup.*profilePosition`
 *    references to resolve nested positions from the `included` array
 */
function extractPositionsFromApiResponse(
  apiEntities: Record<string, unknown>[],
  rawResponse: Record<string, unknown>,
): WorkEntry[] {
  // Build a URN → name map from fsd_employmentType entities included in this response.
  // These entities look like: { entityUrn: "urn:li:fsd_employmentType:12", name: "Full-time", ... }
  const employmentTypeByUrn = new Map<string, string>();
  for (const e of apiEntities) {
    const urn = e.entityUrn as string | undefined;
    const name = e.name as string | undefined;
    if (urn?.includes("fsd_employmentType") && name) {
      employmentTypeByUrn.set(urn, name);
      console.log(`[linkedin][fetchDetails] Found employment type entity: ${urn} → ${name}`);
    }
  }

  // First: check if there are flat Position entities directly
  const flatPositions = apiEntities.filter((e) => {
    const t = e["$type"] as string | undefined;
    return t != null && /position/i.test(t) && !/group/i.test(t) && !/collection/i.test(t);
  });

  if (flatPositions.length > 0) {
    console.log(`[linkedin][fetchDetails] Found ${flatPositions.length} flat Position entities`);
    console.log(
      `[linkedin][fetchDetails] Sample flat position:`,
      JSON.stringify(flatPositions[0], null, 2),
    );
    return flatPositions
      .map((pos) => mapPositionEntity(pos, employmentTypeByUrn))
      .filter((e): e is WorkEntry => e !== null);
  }

  // Second: handle PositionGroup entities
  const positionGroups = apiEntities.filter((e) => {
    const t = e["$type"] as string | undefined;
    return t != null && /positiongroup/i.test(t);
  });

  console.log(`[linkedin][fetchDetails] Found ${positionGroups.length} PositionGroup entities`);

  if (positionGroups.length > 0) {
    console.log(
      `[linkedin][fetchDetails] Sample PositionGroup:`,
      JSON.stringify(positionGroups[0], null, 2),
    );
  }

  // Build a lookup of all included entities by entityUrn for resolving references
  const entityByUrn = new Map<string, Record<string, unknown>>();
  for (const e of apiEntities) {
    const urn = e.entityUrn as string | undefined;
    if (urn) entityByUrn.set(urn, e);
  }

  // Also index by $id if present (some Voyager responses use $id references)
  for (const e of apiEntities) {
    const id = e["$id"] as string | undefined;
    if (id) entityByUrn.set(id, e);
  }

  const allEntries: WorkEntry[] = [];

  for (const group of positionGroups) {
    // The group usually has a company name and nested positions
    const groupCompanyName = (group.name ?? group.companyName ?? "") as string;

    // Try to find nested position references
    // Pattern 1: profilePositionInPositionGroup.elements[] (nested objects)
    // Pattern 2: *profilePositionInPositionGroup (URN references)
    const nestedPositions = extractNestedPositions(group, entityByUrn);

    if (nestedPositions.length > 0) {
      for (const pos of nestedPositions) {
        const entry = mapPositionEntity(pos, employmentTypeByUrn);
        if (entry) {
          // If the nested position doesn't have a company name, inherit from group
          if (!entry.companyName && groupCompanyName) {
            entry.companyName = groupCompanyName;
          }
          allEntries.push(entry);
        }
      }
    } else {
      // The group itself might be a single-position group — try mapping it directly
      const entry = mapPositionEntity(group, employmentTypeByUrn);
      if (entry) allEntries.push(entry);
    }
  }

  // Third: also check data.elements for positions in case they're at the top level
  const dataElements = (rawResponse.data as Record<string, unknown> | undefined)?.elements as
    | Record<string, unknown>[]
    | undefined;
  if (dataElements && allEntries.length === 0) {
    console.log(`[linkedin][fetchDetails] Checking data.elements (${dataElements.length} items)`);
    for (const el of dataElements) {
      console.log(
        `[linkedin][fetchDetails] data.element keys:`,
        Object.keys(el),
        `$type:`,
        el["$type"],
      );
    }
  }

  return allEntries;
}

/**
 * Extracts nested position entities from a PositionGroup.
 * LinkedIn uses several patterns for nesting:
 *   - `profilePositionInPositionGroup.elements[]` (inline objects)
 *   - `*profilePositionInPositionGroup` (URN references to included array)
 *   - `positions` / `profilePositions` (direct array)
 */
function extractNestedPositions(
  group: Record<string, unknown>,
  entityByUrn: Map<string, Record<string, unknown>>,
): Record<string, unknown>[] {
  const positions: Record<string, unknown>[] = [];

  // Pattern 1: inline elements
  for (const key of Object.keys(group)) {
    if (/position/i.test(key) && !key.startsWith("$") && !key.startsWith("*")) {
      const val = group[key];

      // Could be an array of positions
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object") {
            positions.push(item as Record<string, unknown>);
          }
        }
        continue;
      }

      // Could be an object with .elements[] or .paging.elements[]
      if (val && typeof val === "object") {
        const obj = val as Record<string, unknown>;
        const elements = (obj.elements ??
          (obj.paging as Record<string, unknown> | undefined)?.elements) as unknown[] | undefined;
        if (Array.isArray(elements)) {
          for (const item of elements) {
            if (item && typeof item === "object") {
              positions.push(item as Record<string, unknown>);
            }
          }
          continue;
        }

        // Could be a single nested position object with a profilePosition
        const profilePos = obj.profilePosition as Record<string, unknown> | undefined;
        if (profilePos) {
          positions.push(profilePos);
          continue;
        }
      }
    }
  }

  // Pattern 2: URN references (keys starting with *)
  for (const key of Object.keys(group)) {
    if (key.startsWith("*") && /position/i.test(key)) {
      const refs = group[key];
      const urnList = Array.isArray(refs) ? refs : [refs];
      for (const ref of urnList) {
        if (typeof ref === "string") {
          const resolved = entityByUrn.get(ref);
          if (resolved) {
            // The resolved entity might itself contain nested positions
            const profilePos = resolved.profilePosition as Record<string, unknown> | undefined;
            if (profilePos) {
              positions.push(profilePos);
            } else {
              positions.push(resolved);
            }
          }
        }
      }
    }
  }

  if (positions.length > 0) {
    console.log(
      `[linkedin][fetchDetails] Extracted ${positions.length} nested positions from group`,
      `keys of first:`,
      Object.keys(positions[0]),
    );
  }

  return positions;
}

// ─── Endpoint discovery: try multiple dash API paths ────────────────────────

/**
 * Fetches the fsd_profile URN for a LinkedIn profile by calling the classic
 * Voyager profiles endpoint. Only used when the URN cannot be found in the
 * embedded page JSON (e.g. server-side-rendered pages with no <code> blocks).
 */
async function fetchProfileUrnByApi(username: string): Promise<string | null> {
  const data = await voyagerFetch(`/voyager/api/identity/profiles/${encodeURIComponent(username)}`);
  if (!data) return null;

  // The profile entity is either in included[], data.data, or data itself
  const candidates: Record<string, unknown>[] = [
    ...collectIncludedEntities([data]),
    ...(data.data && typeof data.data === "object" ? [data.data as Record<string, unknown>] : []),
    data,
  ];

  for (const e of candidates) {
    const urn = (e.dashEntityUrn ?? e.entityUrn ?? e.objectUrn) as string | undefined;
    if (urn?.startsWith("urn:li:fsd_profile:")) {
      console.log(`[linkedin][fetchDetails] Resolved profileUrn via API profile fetch: ${urn}`);
      return urn;
    }
  }

  return null;
}

/** Endpoints to try for work history (in priority order). */
const WORK_ENDPOINTS = (urn: string) => [
  // Individual positions endpoint (has title, companyName, etc.)
  // count=100 overrides LinkedIn's default page size of ~5 so we get all entries in one shot
  `/voyager/api/identity/dash/profilePositions?q=viewee&profileUrn=${encodeURIComponent(urn)}&count=100`,
  // Position groups endpoint (groups by company, may lack titles)
  `/voyager/api/identity/dash/profilePositionGroups?q=viewee&profileUrn=${encodeURIComponent(urn)}&count=100`,
  `/voyager/api/identity/dash/profilePositionGroups?q=viewee&profileUrn=${encodeURIComponent(urn)}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfilePositionGroup-3&count=100`,
];

/** Endpoints to try for education history (in priority order). */
const EDU_ENDPOINTS = (urn: string) => [
  `/voyager/api/identity/dash/profileEducations?q=viewee&profileUrn=${encodeURIComponent(urn)}&count=100`,
  `/voyager/api/identity/dash/profileEducations?q=viewee&profileUrn=${encodeURIComponent(urn)}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileEducation-3&count=100`,
];

/**
 * Tries multiple API endpoints in order, returns the first successful response.
 */
async function tryEndpoints(endpoints: string[]): Promise<Record<string, unknown> | null> {
  for (const path of endpoints) {
    const data = await voyagerFetch(path);
    if (data) return data;
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches the full work history for a LinkedIn profile.
 *
 * 1. Mines the live page's <code> blocks for the profileUrn
 * 2. Tries Voyager dash API (with count=100 to get all entries in one page)
 * 3. Falls back to live page position entities if API fails
 * 4. Returns [] if everything fails (caller should use live-DOM scrape)
 */
export async function fetchFullWorkHistory(
  username: string,
  domLogos?: Map<string, string>,
): Promise<WorkEntry[]> {
  // ── Step 1: Mine live page for the profileUrn and any embedded entities ──
  const blocks = extractLivePageJsonBlocks();
  const entities = collectIncludedEntities(blocks);
  logEntityTypes(entities, "live page");

  let profileUrn = extractProfileUrn(entities, username);

  // If the URN wasn't embedded in the page, try fetching it from the API directly.
  if (!profileUrn) {
    profileUrn = await fetchProfileUrnByApi(username);
  }

  // ── Step 2: Try dash API endpoints (authoritative — requests up to 100 entries) ──
  if (profileUrn) {
    for (const path of WORK_ENDPOINTS(profileUrn)) {
      const data = await voyagerFetch(path);
      if (!data) continue;

      const apiEntities = collectIncludedEntities([data]);
      logEntityTypes(
        apiEntities,
        `work API (${path.includes("Positions?") ? "positions" : "groups"})`,
      );

      const entries = extractPositionsFromApiResponse(apiEntities, data);

      // Accept if we got entries AND at least one has a title
      const hasTitle = entries.some((e) => e.title);
      if (entries.length > 0 && hasTitle) {
        console.log(
          `[linkedin][fetchDetails] Parsed ${entries.length} work entries from API (with titles)`,
          entries.map((e) => `${e.title} @ ${e.companyName}`),
        );
        return enrichEntriesWithLogos(entries, apiEntities, domLogos);
      }

      // If we got entries but no titles, keep trying other endpoints
      if (entries.length > 0) {
        console.log(
          `[linkedin][fetchDetails] Got ${entries.length} entries but no titles — trying next endpoint`,
        );
      }
    }

    // Last resort: re-try first successful endpoint and return whatever we got
    const data = await tryEndpoints(WORK_ENDPOINTS(profileUrn));
    if (data) {
      const apiEntities = collectIncludedEntities([data]);
      const entries = extractPositionsFromApiResponse(apiEntities, data);
      if (entries.length > 0) {
        console.log(
          `[linkedin][fetchDetails] Parsed ${entries.length} work entries from API (fallback, may lack titles)`,
          entries.map((e) => `${e.title} @ ${e.companyName}`),
        );
        return enrichEntriesWithLogos(entries, apiEntities, domLogos);
      }
    }
  } else {
    console.warn(`[linkedin][fetchDetails] No profileUrn — cannot call dash API`);
  }

  // ── Step 3: Fall back to live page position entities ──
  const positionEntities = entities.filter((e) => {
    const t = e["$type"] as string | undefined;
    return (
      t != null &&
      (/position/i.test(t) || /experience/i.test(t)) &&
      // Exclude group/collection wrappers
      !/group/i.test(t) &&
      !/collection/i.test(t)
    );
  });

  console.log(
    `[linkedin][fetchDetails] Live page position entities (fallback): ${positionEntities.length}`,
  );

  if (positionEntities.length > 0) {
    console.log(
      `[linkedin][fetchDetails] Sample position (live):`,
      JSON.stringify(positionEntities[0], null, 2),
    );

    const liveEmploymentTypeByUrn = new Map<string, string>();
    for (const e of entities) {
      const urn = e.entityUrn as string | undefined;
      const name = e.name as string | undefined;
      if (urn?.includes("fsd_employmentType") && name) {
        liveEmploymentTypeByUrn.set(urn, name);
      }
    }

    const entries = positionEntities
      .map((pos) => mapPositionEntity(pos, liveEmploymentTypeByUrn))
      .filter((e): e is WorkEntry => e !== null);

    if (entries.length > 0) {
      console.log(
        `[linkedin][fetchDetails] Parsed ${entries.length} work entries from live page (fallback)`,
        entries.map((e) => `${e.title} @ ${e.companyName}`),
      );
      return enrichEntriesWithLogos(entries, entities, domLogos);
    }
  }

  console.warn(`[linkedin][fetchDetails] All work history sources failed for ${username}`);
  return [];
}

/**
 * Fetches the full education history for a LinkedIn profile.
 *
 * Same strategy as work: API first (count=100) → live page fallback → [].
 */
export async function fetchFullEducation(username: string): Promise<EducationEntry[]> {
  // ── Step 1: Mine live page for the profileUrn and any embedded entities ──
  const blocks = extractLivePageJsonBlocks();
  const entities = collectIncludedEntities(blocks);

  let profileUrn = extractProfileUrn(entities, username);

  // If the URN wasn't embedded in the page, try the API profile endpoint.
  if (!profileUrn) {
    profileUrn = await fetchProfileUrnByApi(username);
  }

  // ── Step 2: Try dash API (authoritative — requests up to 100 entries) ──
  if (profileUrn) {
    const data = await tryEndpoints(EDU_ENDPOINTS(profileUrn));

    if (data) {
      const apiEntities = collectIncludedEntities([data]);
      logEntityTypes(apiEntities, "education API");

      const apiEducation = apiEntities.filter((e) => {
        const t = e["$type"] as string | undefined;
        return (
          t != null &&
          (/education/i.test(t) || /school/i.test(t)) &&
          !/collection/i.test(t) &&
          !/setting/i.test(t)
        );
      });

      console.log(`[linkedin][fetchDetails] API education entities: ${apiEducation.length}`);
      if (apiEducation.length > 0) {
        console.log(
          `[linkedin][fetchDetails] Sample education (API):`,
          JSON.stringify(apiEducation[0], null, 2),
        );
      }

      const entries = (await Promise.all(apiEducation.map(mapEducationEntityAsync))).filter(
        (e): e is EducationEntry => e !== null,
      );

      if (entries.length > 0) {
        console.log(
          `[linkedin][fetchDetails] Parsed ${entries.length} education entries from API`,
          entries.map((e) => `${e.schoolName} — ${e.degree ?? "(no degree)"}`),
        );
        return enrichEducationWithLogos(entries);
      }
    } else {
      console.warn(`[linkedin][fetchDetails] All education API endpoints failed for ${username}`);
    }
  } else {
    console.warn(`[linkedin][fetchDetails] No profileUrn — cannot call dash API for education`);
  }

  // ── Step 3: Fall back to live page education entities ──
  const educationEntities = entities.filter((e) => {
    const t = e["$type"] as string | undefined;
    return (
      t != null &&
      (/education/i.test(t) || /school/i.test(t)) &&
      !/collection/i.test(t) &&
      !/setting/i.test(t)
    );
  });

  console.log(
    `[linkedin][fetchDetails] Live page education entities (fallback): ${educationEntities.length}`,
  );

  if (educationEntities.length > 0) {
    console.log(
      `[linkedin][fetchDetails] Sample education (live):`,
      JSON.stringify(educationEntities[0], null, 2),
    );

    const entries = (await Promise.all(educationEntities.map(mapEducationEntityAsync))).filter(
      (e): e is EducationEntry => e !== null,
    );

    if (entries.length > 0) {
      console.log(
        `[linkedin][fetchDetails] Parsed ${entries.length} education entries from live page (fallback)`,
        entries.map((e) => `${e.schoolName} — ${e.degree ?? "(no degree)"}`),
      );
      return enrichEducationWithLogos(entries);
    }
  }

  console.warn(`[linkedin][fetchDetails] All education history sources failed for ${username}`);
  return [];
}
