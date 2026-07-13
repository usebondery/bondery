/**
 * Work history fetching via Voyager dash API with logo enrichment.
 */

import { extLog } from "../../../../lib/log";
import type { WorkEntry } from "../workExperience";
import { enrichWorkEntriesWithLogos, extractLogoUrlFromVoyagerImage } from "./voyagerLogos";
import {
  collectIncludedEntities,
  extractDates,
  extractLivePageJsonBlocks,
  extractProfileUrn,
  logEntityTypes,
  resolveEmploymentType,
  tryEndpoints,
  voyagerFetch,
} from "./voyagerShared";

function mapPositionEntity(
  pos: Record<string, unknown>,
  employmentTypeByUrn?: Map<string, string>,
): WorkEntry | null {
  const title = (pos.title ?? "") as string;
  const companyName = (pos.companyName ?? pos.subtitle ?? "") as string;
  if (!title && !companyName) {
    return null;
  }

  const { startDate, endDate } = extractDates(pos);
  const locationName = (pos.locationName ?? pos.geoLocationName ?? pos.caption) as
    | string
    | undefined;
  const description = (pos.description ?? "") as string | undefined;

  // Employment type: resolve via the entity map first, then named fallback
  const empTypeUrn = pos.employmentTypeUrn as string | undefined;
  if (empTypeUrn) {
    extLog.debug(`[linkedin][fetchDetails] Raw employmentTypeUrn: ${empTypeUrn}`);
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
    companyName,
    title,
    ...(companyLinkedinId ? { companyLinkedinId } : {}),
    ...(companyLogoUrl ? { companyLogoUrl } : {}),
    ...(companyUrn ? { companyUrn } : {}),
    endDate,
    startDate,
    ...(employmentType ? { employmentType } : {}),
    description: description || undefined,
    location: locationName ?? undefined,
  };
}

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
      extLog.debug(`[linkedin][fetchDetails] Found employment type entity: ${urn} → ${name}`);
    }
  }

  // First: check if there are flat Position entities directly
  const flatPositions = apiEntities.filter((e) => {
    const t = e.$type as string | undefined;
    return t != null && /position/i.test(t) && !/group/i.test(t) && !/collection/i.test(t);
  });

  if (flatPositions.length > 0) {
    extLog.debug(`[linkedin][fetchDetails] Found ${flatPositions.length} flat Position entities`);
    extLog.debug(
      `[linkedin][fetchDetails] Sample flat position:`,
      JSON.stringify(flatPositions[0], null, 2),
    );
    return flatPositions
      .map((pos) => mapPositionEntity(pos, employmentTypeByUrn))
      .filter((e): e is WorkEntry => e !== null);
  }

  // Second: handle PositionGroup entities
  const positionGroups = apiEntities.filter((e) => {
    const t = e.$type as string | undefined;
    return t != null && /positiongroup/i.test(t);
  });

  extLog.debug(`[linkedin][fetchDetails] Found ${positionGroups.length} PositionGroup entities`);

  if (positionGroups.length > 0) {
    extLog.debug(
      `[linkedin][fetchDetails] Sample PositionGroup:`,
      JSON.stringify(positionGroups[0], null, 2),
    );
  }

  // Build a lookup of all included entities by entityUrn for resolving references
  const entityByUrn = new Map<string, Record<string, unknown>>();
  for (const e of apiEntities) {
    const urn = e.entityUrn as string | undefined;
    if (urn) {
      entityByUrn.set(urn, e);
    }
  }

  // Also index by $id if present (some Voyager responses use $id references)
  for (const e of apiEntities) {
    const id = e.$id as string | undefined;
    if (id) {
      entityByUrn.set(id, e);
    }
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
      if (entry) {
        allEntries.push(entry);
      }
    }
  }

  // Third: also check data.elements for positions in case they're at the top level
  const dataElements = (rawResponse.data as Record<string, unknown> | undefined)?.elements as
    | Record<string, unknown>[]
    | undefined;
  if (dataElements && allEntries.length === 0) {
    extLog.debug(`[linkedin][fetchDetails] Checking data.elements (${dataElements.length} items)`);
    for (const el of dataElements) {
      extLog.debug(
        `[linkedin][fetchDetails] data.element keys:`,
        Object.keys(el),
        `$type:`,
        el.$type,
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
    extLog.debug(
      `[linkedin][fetchDetails] Extracted ${positions.length} nested positions from group`,
      `keys of first:`,
      Object.keys(positions[0]),
    );
  }

  return positions;
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

  const profileUrn = extractProfileUrn(entities, username);

  // ── Step 2: Try dash API endpoints (authoritative — requests up to 100 entries) ──
  if (profileUrn) {
    for (const path of WORK_ENDPOINTS(profileUrn)) {
      const data = await voyagerFetch(path);
      if (!data) {
        continue;
      }

      const apiEntities = collectIncludedEntities([data]);
      logEntityTypes(
        apiEntities,
        `work API (${path.includes("Positions?") ? "positions" : "groups"})`,
      );

      const entries = extractPositionsFromApiResponse(apiEntities, data);

      // Accept if we got entries AND at least one has a title
      const hasTitle = entries.some((e) => e.title);
      if (entries.length > 0 && hasTitle) {
        extLog.debug(
          `[linkedin][fetchDetails] Parsed ${entries.length} work entries from API (with titles)`,
          entries.map((e) => `${e.title} @ ${e.companyName}`),
        );
        return enrichWorkEntriesWithLogos(entries, apiEntities, domLogos);
      }

      // If we got entries but no titles, keep trying other endpoints
      if (entries.length > 0) {
        extLog.debug(
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
        extLog.debug(
          `[linkedin][fetchDetails] Parsed ${entries.length} work entries from API (fallback, may lack titles)`,
          entries.map((e) => `${e.title} @ ${e.companyName}`),
        );
        return enrichWorkEntriesWithLogos(entries, apiEntities, domLogos);
      }
    }
  } else {
    extLog.warn(`[linkedin][fetchDetails] No profileUrn — cannot call dash API`);
  }

  // ── Step 3: Fall back to live page position entities ──
  const positionEntities = entities.filter((e) => {
    const t = e.$type as string | undefined;
    return (
      t != null &&
      (/position/i.test(t) || /experience/i.test(t)) &&
      // Exclude group/collection wrappers
      !/group/i.test(t) &&
      !/collection/i.test(t)
    );
  });

  extLog.debug(
    `[linkedin][fetchDetails] Live page position entities (fallback): ${positionEntities.length}`,
  );

  if (positionEntities.length > 0) {
    extLog.debug(
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
      extLog.debug(
        `[linkedin][fetchDetails] Parsed ${entries.length} work entries from live page (fallback)`,
        entries.map((e) => `${e.title} @ ${e.companyName}`),
      );
      return enrichWorkEntriesWithLogos(entries, entities, domLogos);
    }
  }

  extLog.warn(`[linkedin][fetchDetails] All work history sources failed for ${username}`);
  return [];
}
