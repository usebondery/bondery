/**
 * Voyager logo/image URL extraction and company logo fetching.
 */

import type { WorkEntry } from "../workExperience";
import { voyagerFetch } from "./voyagerShared";

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
export function extractLogoUrlFromVoyagerImage(
  img: Record<string, unknown>,
  depth = 0,
): string | undefined {
  if (depth > 5) {
    return undefined;
  }

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
  if (url?.startsWith("http")) {
    return url;
  }

  // Recurse into nested objects (handles image, vectorImage,
  // com.linkedin.common.VectorImage, logoResolutionResult, etc.)
  for (const value of Object.values(img)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const result = extractLogoUrlFromVoyagerImage(value as Record<string, unknown>, depth + 1);
      if (result) {
        return result;
      }
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
      if (url) {
        return url;
      }
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
    if (url) {
      return url;
    }
  }

  // Check elements array (handles { elements: [...] } or { data: { elements: [...] } })
  const elements = ((data.data as Record<string, unknown> | undefined)?.elements ??
    data.elements) as Record<string, unknown>[] | undefined;
  if (elements) {
    for (const el of elements) {
      const url = extractLogoFromEntity(el);
      if (url) {
        return url;
      }
    }
  }

  // Check data.data as a single entity (e.g. q=entityUrn single result)
  const dataData = data.data as Record<string, unknown> | undefined;
  if (dataData && typeof dataData === "object" && !Array.isArray(dataData)) {
    const url = extractLogoFromEntity(dataData);
    if (url) {
      return url;
    }
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
export async function fetchCompanyLogo(
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
      if (url) {
        return url;
      }
    }
  }

  // Strategy 2: query by entity URN (requires a URN)
  if (companyUrn) {
    const data = await voyagerFetch(
      `/voyager/api/identity/dash/companies?q=entityUrn&entityUrn=${encodeURIComponent(companyUrn)}`,
    );
    if (data) {
      const url = extractLogoFromCompanyResponse(data);
      if (url) {
        return url;
      }
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
      if (url) {
        return url;
      }
    }
  }

  return undefined;
}

/**
 * Builds a companyUrn → logoUrl map from the `included` entities
 * of a Voyager API response. Company entities sit alongside position entities
 * in the same response, so we can extract logos without extra network requests.
 */
export function extractCompanyLogosFromIncluded(
  entities: Record<string, unknown>[],
): Map<string, string> {
  const logoMap = new Map<string, string>();
  const companyEntities = entities.filter((e) => {
    const urn = e.entityUrn as string | undefined;
    return urn?.includes("fsd_company");
  });
  for (const entity of companyEntities) {
    const urn = entity.entityUrn as string | undefined;
    if (!urn) {
      continue;
    }
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
 */
export async function enrichWorkEntriesWithLogos(
  entries: WorkEntry[],
  includedEntities?: Record<string, unknown>[],
  domLogos?: Map<string, string>,
): Promise<WorkEntry[]> {
  // Step 0: Apply DOM logos (free — already scraped synchronously by the caller)
  if (domLogos && domLogos.size > 0) {
    entries = entries.map((entry) => {
      if (entry.companyLogoUrl) {
        return entry;
      }
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
    if (entry.companyLogoUrl || !entry.companyUrn) {
      return entry;
    }
    const logoUrl = includedLogos.get(entry.companyUrn);
    return logoUrl ? { ...entry, companyLogoUrl: logoUrl } : entry;
  });

  // Step 2: Batch-fetch logos for entries still missing one.
  type FetchTask = { key: string; urn: string | undefined; linkedInId: string | undefined };
  const tasks: FetchTask[] = [];
  const seenKeys = new Set<string>();

  for (const entry of entries) {
    if (entry.companyLogoUrl) {
      continue;
    }
    const key =
      entry.companyUrn ?? (entry.companyLinkedinId ? `id:${entry.companyLinkedinId}` : null);
    if (!key || seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    tasks.push({ key, linkedInId: entry.companyLinkedinId, urn: entry.companyUrn });
  }

  if (tasks.length === 0) {
    return entries;
  }

  const keyToLogo = new Map<string, string>();
  await Promise.all(
    tasks.map(async ({ key, urn, linkedInId }) => {
      try {
        const logoUrl = await fetchCompanyLogo(urn, linkedInId);
        if (logoUrl) {
          keyToLogo.set(key, logoUrl);
        }
      } catch {
        /* ignore individual logo fetch failures */
      }
    }),
  );

  return entries.map((entry) => {
    if (entry.companyLogoUrl) {
      return entry;
    }
    const key =
      entry.companyUrn ?? (entry.companyLinkedinId ? `id:${entry.companyLinkedinId}` : null);
    if (!key) {
      return entry;
    }
    const logoUrl = keyToLogo.get(key);
    return logoUrl ? { ...entry, companyLogoUrl: logoUrl } : entry;
  });
}
