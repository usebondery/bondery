/**
 * Shared Voyager API utilities: page JSON mining, CSRF auth, dates, profile URN.
 */

import { extLog } from "../../../../lib/log";
import { extractProfileUrnFromComponentKey } from "../sduiProfile";
import { logVoyagerExchange } from "./voyagerDump";

const DIGITS_ONLY_RE = /^\d+$/;
const JSESSIONID_COOKIE_RE = /JSESSIONID="?([^";]+)"?/;
const HTML_COMMENT_WRAPPER_RE = /^<!--(.+)-->$/s;
const URN_ID_SUFFIX_RE = /:([A-Za-z0-9_-]+)$/;
// ─── Types ───────────────────────────────────────────────────────────────────

interface VoyagerTimePeriod {
  endDate?: { month?: number; year?: number };
  startDate?: { month?: number; year?: number };
}

interface VoyagerDateRange {
  end?: { month?: number; year?: number };
  start?: { month?: number; year?: number };
}

/**
 * Untrusted LinkedIn Voyager JSON. Named fields are the ones this scrape reads.
 * Other keys stay on the index signature.
 */
interface VoyagerEntity {
  "*company"?: unknown;
  "*country"?: unknown;
  "*geo"?: unknown;
  "*profile"?: unknown;
  $id?: unknown;
  $type?: unknown;
  about?: unknown;
  activities?: unknown;
  artifacts?: VoyagerEntity[];
  caption?: unknown;
  company?: VoyagerEntity;
  companyLogo?: VoyagerEntity;
  companyName?: unknown;
  companyUrn?: unknown;
  countryISOCode?: unknown;
  dashEntityUrn?: unknown;
  data?: VoyagerEntity;
  dateRange?: VoyagerDateRange;
  defaultLocalizedName?: unknown;
  defaultLocalizedNameWithoutCountryName?: unknown;
  degreeName?: unknown;
  description?: unknown;
  displayImageReference?: unknown;
  displayImageReferenceResolutionResult?: unknown;
  elements?: VoyagerEntity[];
  employmentTypeUrn?: unknown;
  entityUrn?: unknown;
  expandableText?: VoyagerEntity;
  expandableTextComponent?: VoyagerEntity;
  fieldOfStudy?: unknown;
  fileIdentifyingUrlPathSegment?: unknown;
  firstName?: unknown;
  fullName?: unknown;
  geoLocation?: VoyagerEntity;
  geoLocationName?: unknown;
  geoUrn?: unknown;
  headline?: unknown;
  included?: VoyagerEntity[];
  lastName?: unknown;
  localized?: unknown;
  locationName?: unknown;
  logo?: VoyagerEntity;
  logoResolutionResult?: VoyagerEntity;
  logoV2?: VoyagerEntity;
  middleName?: unknown;
  miniCompany?: VoyagerEntity;
  miniSchool?: VoyagerEntity;
  multiLocaleDegreeName?: unknown;
  multiLocaleFieldOfStudy?: unknown;
  multiLocaleSchoolName?: unknown;
  multiLocaleSummary?: unknown;
  name?: unknown;
  objectUrn?: unknown;
  paging?: VoyagerEntity;
  picture?: unknown;
  plainTextSummary?: unknown;
  profilePicture?: VoyagerEntity;
  profilePosition?: VoyagerEntity;
  profileStatefulProfileFields?: VoyagerEntity;
  publicIdentifier?: unknown;
  rootUrl?: unknown;
  school?: VoyagerEntity;
  schoolName?: unknown;
  schoolUrn?: unknown;
  subtitle?: unknown;
  summary?: unknown;
  text?: unknown;
  timePeriod?: VoyagerTimePeriod;
  title?: unknown;
  universalName?: unknown;
  url?: unknown;
  value?: unknown;
  vanityName?: unknown;
  vectorImage?: VoyagerEntity;
  width?: unknown;
  [key: string]: unknown;
}

/**
 * Normalises a Voyager date structure — handles both:
 *   timePeriod: { startDate: { year, month }, endDate: … }  (old format)
 *   dateRange:  { start:     { year, month }, end: … }      (dash format)
 */
function extractDates(entity: VoyagerEntity): {
  startDate?: string;
  endDate?: string;
} {
  const tp = entity.timePeriod;
  const dr = entity.dateRange;

  const start = tp?.startDate ?? dr?.start;
  const end = tp?.endDate ?? dr?.end;

  return {
    endDate: formatVoyagerDate(end),
    startDate: formatVoyagerDate(start),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps Voyager employment type URN keys to human-readable labels.
 * LinkedIn uses both named keys (FULL_TIME) and numeric IDs (12) depending on
 * the API version/endpoint. Both are mapped here.
 */
const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  APPRENTICESHIP: "Apprenticeship",
  CONTRACT: "Contract",
  FREELANCE: "Freelance",
  // Named variants from older Voyager endpoints
  FULL_TIME: "Full-time",
  INTERNSHIP: "Internship",
  PART_TIME: "Part-time",
  SEASONAL: "Seasonal",
  SELF_EMPLOYED: "Self-employed",
  TEMPORARY: "Temporary",
  VOLUNTEER: "Volunteer",
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
    if (fromEntity) {
      return fromEntity;
    }
  }
  // Fallback: named enum key
  const key = urn.split(":").pop() ?? "";
  const label = EMPLOYMENT_TYPE_LABELS[key] ?? EMPLOYMENT_TYPE_LABELS[key.toUpperCase()];
  if (label) {
    return label;
  }
  // Don't surface raw numeric IDs — the entity was not included in this response
  if (DIGITS_ONLY_RE.test(key)) {
    return undefined;
  }
  return key.replace(/-/g, " ");
}

function formatVoyagerDate(d?: { month?: number; year?: number }): string | undefined {
  if (!d?.year) {
    return undefined;
  }
  if (d.month) {
    return `${d.year}-${String(d.month).padStart(2, "0")}`;
  }
  return String(d.year);
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(JSESSIONID_COOKIE_RE);
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
    if (!raw) {
      continue;
    }

    // LinkedIn wraps JSON in HTML comments: <!--{...}-->
    const commentMatch = raw.match(HTML_COMMENT_WRAPPER_RE);
    const jsonStr = commentMatch?.[1] ?? raw;

    try {
      const parsed = JSON.parse(jsonStr);
      blocks.push(parsed);
    } catch {
      // Not valid JSON — skip
    }
  }

  extLog.debug(`[linkedin][fetchDetails] Live page: found ${blocks.length} JSON <code> blocks`);
  return blocks;
}

/**
 * Collects all objects in `included` arrays across all JSON blocks.
 */
function collectIncludedEntities(blocks: unknown[]): VoyagerEntity[] {
  const entities: VoyagerEntity[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const obj = block as VoyagerEntity;
    if (Array.isArray(obj.included)) {
      for (const item of obj.included) {
        if (item && typeof item === "object") {
          entities.push(item);
        }
      }
    }
  }
  return entities;
}

const MAX_VOYAGER_OBJECTS = 2000;
const MAX_VOYAGER_WALK_DEPTH = 6;

/**
 * Walks Voyager JSON (root, `data`, `elements`, `included`) so About/`summary`
 * is not dropped when LinkedIn puts it outside `included`.
 */
function collectVoyagerObjects(root: unknown): VoyagerEntity[] {
  const out: VoyagerEntity[] = [];
  const seen = new Set<object>();

  const visit = (value: unknown, depth: number): void => {
    if (
      value === null ||
      value === undefined ||
      depth > MAX_VOYAGER_WALK_DEPTH ||
      out.length >= MAX_VOYAGER_OBJECTS
    ) {
      return;
    }
    if (typeof value !== "object") {
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, depth + 1);
      }
      return;
    }
    const entity = value as VoyagerEntity;
    out.push(entity);
    for (const child of Object.values(entity)) {
      visit(child, depth + 1);
    }
  };

  visit(root, 0);
  return out;
}

/**
 * Logs all unique $type values found in entities (for debugging).
 */
function logEntityTypes(entities: VoyagerEntity[], label: string): void {
  const types = new Set<string>();
  for (const e of entities) {
    const t = e.$type as string | undefined;
    if (t) {
      types.add(t);
    }
  }
  extLog.debug(
    `[linkedin][fetchDetails] ${label} — ${entities.length} entities, ${types.size} types:`,
    [...types],
  );
}

// ─── 2. Voyager dash API caller ─────────────────────────────────────────────

async function voyagerFetch(path: string): Promise<VoyagerEntity | null> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    extLog.warn("[linkedin][fetchDetails] No JSESSIONID cookie — cannot call Voyager API");
    logVoyagerExchange({ path, status: "no-jsession" });
    return null;
  }

  const url = `https://www.linkedin.com${path}`;
  extLog.debug(`[linkedin][fetchDetails] Voyager API: ${url}`);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    // Isolated-world fetch is `chrome-extension://…` origin. `same-origin`
    // omits LinkedIn cookies; `include` + host_permissions sends them.
    const response = await fetch(url, {
      credentials: "include",
      headers: {
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "csrf-token": csrfToken,
        "x-restli-protocol-version": "2.0.0",
      },
      referrer: location.href,
      signal: controller.signal,
    });

    if (!response.ok) {
      extLog.warn(`[linkedin][fetchDetails] Voyager ${response.status} for ${path}`);
      logVoyagerExchange({ path, status: response.status });
      return null;
    }

    const body = (await response.json()) as VoyagerEntity;
    logVoyagerExchange({ body, path, status: response.status });
    return body;
  } catch (error) {
    extLog.warn(`[linkedin][fetchDetails] Voyager error for ${path}:`, error);
    logVoyagerExchange({ error, path, status: "error" });
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function nfcText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return value.normalize("NFC");
}

/**
 * Extracts the fsd_profile URN for the viewed profile on SDUI pages.
 */
function extractProfileUrn(entities: VoyagerEntity[], username: string): string | null {
  // 1. SDUI topcard componentkey (primary — validated on current LinkedIn UI)
  const fromComponentKey = extractProfileUrnFromComponentKey();
  if (fromComponentKey) {
    extLog.debug(`[linkedin][fetchDetails] profileUrn source: componentkey → ${fromComponentKey}`);
    return fromComponentKey;
  }

  // 2. Embedded <code> JSON blocks (secondary — when Voyager data is inlined)
  const normalizedUsername = nfcText(username);
  if (!normalizedUsername) {
    return null;
  }
  for (const e of entities) {
    const pubId = nfcText(e.publicIdentifier) ?? nfcText(e.vanityName);
    if (pubId !== normalizedUsername) {
      continue;
    }

    const urn = (e.entityUrn ?? e.objectUrn ?? e.dashEntityUrn ?? e["*profile"]) as
      | string
      | undefined;
    if (!urn || typeof urn !== "string") {
      continue;
    }

    if (urn.startsWith("urn:li:fsd_profile:")) {
      extLog.debug(`[linkedin][fetchDetails] profileUrn source: embedded → ${urn}`);
      return urn;
    }
    const idMatch = urn.match(URN_ID_SUFFIX_RE);
    if (idMatch) {
      const fsdUrn = `urn:li:fsd_profile:${idMatch[1]}`;
      extLog.debug(`[linkedin][fetchDetails] profileUrn source: embedded → ${fsdUrn}`);
      return fsdUrn;
    }
  }

  extLog.warn(`[linkedin][fetchDetails] profileUrn source: none for ${username}`);
  return null;
}

function buildEntityByUrn(entities: VoyagerEntity[]): Map<string, VoyagerEntity> {
  const map = new Map<string, VoyagerEntity>();
  for (const e of entities) {
    const urn = e.entityUrn as string | undefined;
    if (urn) {
      map.set(urn, e);
    }
    const id = e.$id as string | undefined;
    if (id) {
      map.set(id, e);
    }
  }
  return map;
}

export type { VoyagerEntity };
export {
  buildEntityByUrn,
  collectIncludedEntities,
  collectVoyagerObjects,
  extractDates,
  extractLivePageJsonBlocks,
  extractProfileUrn,
  logEntityTypes,
  nfcText,
  resolveEmploymentType,
  voyagerFetch,
};
