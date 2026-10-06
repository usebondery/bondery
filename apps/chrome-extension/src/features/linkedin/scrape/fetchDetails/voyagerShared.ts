/**
 * Shared Voyager API utilities: page JSON mining, CSRF auth, dates, profile URN.
 */

import { extLog } from "../../../../lib/log";
import { extractProfileUrnFromComponentKey } from "../sduiProfile";

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
 * Normalises a Voyager date structure — handles both:
 *   timePeriod: { startDate: { year, month }, endDate: … }  (old format)
 *   dateRange:  { start:     { year, month }, end: … }      (dash format)
 */
export function extractDates(entity: Record<string, unknown>): {
  startDate?: string;
  endDate?: string;
} {
  const tp = entity.timePeriod as VoyagerTimePeriod | undefined;
  const dr = entity.dateRange as VoyagerDateRange | undefined;

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
export function resolveEmploymentType(
  urn: string,
  entityMap?: Map<string, string>,
): string | undefined {
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
  if (/^\d+$/.test(key)) {
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
  const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
  return match?.[1] ?? null;
}

// ─── 1. Mine embedded <code> blocks from the LIVE page ──────────────────────

/**
 * Extracts all JSON objects from `<code>` elements in the live document.
 * LinkedIn wraps Voyager data in `<!--{JSON}-->` inside hidden <code> tags.
 */
export function extractLivePageJsonBlocks(): unknown[] {
  const codeElements = document.querySelectorAll("code");
  const blocks: unknown[] = [];

  for (const code of codeElements) {
    const raw = code.innerHTML?.trim();
    if (!raw) {
      continue;
    }

    // LinkedIn wraps JSON in HTML comments: <!--{...}-->
    const commentMatch = raw.match(/^<!--(.+)-->$/s);
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
export function collectIncludedEntities(blocks: unknown[]): Record<string, unknown>[] {
  const entities: Record<string, unknown>[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }
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

const MAX_VOYAGER_OBJECTS = 2_000;
const MAX_VOYAGER_WALK_DEPTH = 6;

/**
 * Walks Voyager JSON (root, `data`, `elements`, `included`) so About/`summary`
 * is not dropped when LinkedIn puts it outside `included`.
 */
export function collectVoyagerObjects(root: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const seen = new Set<object>();

  const visit = (value: unknown, depth: number): void => {
    if (value == null || depth > MAX_VOYAGER_WALK_DEPTH || out.length >= MAX_VOYAGER_OBJECTS) {
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
    out.push(value as Record<string, unknown>);
    for (const child of Object.values(value as Record<string, unknown>)) {
      visit(child, depth + 1);
    }
  };

  visit(root, 0);
  return out;
}

/**
 * Logs all unique $type values found in entities (for debugging).
 */
export function logEntityTypes(entities: Record<string, unknown>[], label: string): void {
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

export async function voyagerFetch(path: string): Promise<Record<string, unknown> | null> {
  const csrfToken = getCsrfToken();
  if (!csrfToken) {
    extLog.warn("[linkedin][fetchDetails] No JSESSIONID cookie — cannot call Voyager API");
    return null;
  }

  const url = `https://www.linkedin.com${path}`;
  extLog.debug(`[linkedin][fetchDetails] Voyager API: ${url}`);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8_000);

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
      return null;
    }

    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    extLog.warn(`[linkedin][fetchDetails] Voyager error for ${path}:`, error);
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function nfcText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return value.normalize("NFC");
}

/**
 * Extracts the fsd_profile URN for the viewed profile on SDUI pages.
 */
export function extractProfileUrn(
  entities: Record<string, unknown>[],
  username: string,
): string | null {
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
    const idMatch = urn.match(/:([A-Za-z0-9_-]+)$/);
    if (idMatch) {
      const fsdUrn = `urn:li:fsd_profile:${idMatch[1]}`;
      extLog.debug(`[linkedin][fetchDetails] profileUrn source: embedded → ${fsdUrn}`);
      return fsdUrn;
    }
  }

  extLog.warn(`[linkedin][fetchDetails] profileUrn source: none for ${username}`);
  return null;
}

export function buildEntityByUrn(
  entities: Record<string, unknown>[],
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
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
