/**
 * Compaction for browser CSP violation reports.
 *
 * The body is untrusted input from any page that can reach the endpoint. Keep
 * only what identifies the violation, and never the full URL with its query:
 * a query string can carry user content.
 *
 * Two shapes arrive:
 * - `application/csp-report` — `{ "csp-report": { ... } }`, the legacy shape.
 * - `application/reports+json` — `[{ type, body: { ... } }]`, the Reporting API.
 *
 * Both are accepted. `sample` is always dropped, because it can contain the
 * reported document fragment.
 */

/** Longest directive name kept. Real names are far shorter. */
const MAX_DIRECTIVE_LENGTH = 64;
/** Longest disposition kept (`enforce` or `report`). */
const MAX_DISPOSITION_LENGTH = 16;
/** Longest path or file kept. Truncation is a data cap, not a validation rule. */
const MAX_PATH_LENGTH = 512;
/** Longest host kept. 253 is the DNS maximum. */
const MAX_HOST_LENGTH = 253;
/** Bound on the work one request can cause. */
const MAX_VIOLATIONS = 20;

export type CompactedCspViolation = {
  blockedOriginPath?: string;
  disposition?: string;
  documentPath?: string;
  effectiveDirective?: string;
  lineNumber?: number;
  sourceFile?: string;
};

export type CompactedCspReport = {
  siteHost: string;
  violations: CompactedCspViolation[];
};

function capString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.slice(0, maxLength);
}

/** Path only, with the query and fragment removed. */
function toPath(value: unknown): string | undefined {
  const raw = capString(value, MAX_PATH_LENGTH * 4);
  if (!raw) {
    return undefined;
  }
  try {
    return new URL(raw).pathname.slice(0, MAX_PATH_LENGTH);
  } catch {
    // Not an absolute URL. Drop any query or fragment it carries.
    return raw.split(/[?#]/)[0]?.slice(0, MAX_PATH_LENGTH);
  }
}

/**
 * Origin plus path, never the query.
 *
 * CSP uses bare keywords for some blocked resources (`inline`, `eval`,
 * `data`), which have no origin, so those pass through unchanged.
 */
function toOriginAndPath(value: unknown): string | undefined {
  const raw = capString(value, MAX_PATH_LENGTH * 4);
  if (!raw) {
    return undefined;
  }
  try {
    const url = new URL(raw);
    return `${url.origin}${url.pathname}`.slice(0, MAX_PATH_LENGTH);
  } catch {
    return raw.split(/[?#]/)[0]?.slice(0, MAX_PATH_LENGTH);
  }
}

function toLineNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

function hostOf(value: unknown): string | undefined {
  const raw = capString(value, MAX_PATH_LENGTH * 4);
  if (!raw) {
    return undefined;
  }
  try {
    return new URL(raw).host.slice(0, MAX_HOST_LENGTH);
  } catch {
    return undefined;
  }
}

function compactLegacy(raw: Record<string, unknown>): CompactedCspViolation {
  return {
    blockedOriginPath: toOriginAndPath(raw["blocked-uri"]),
    disposition: capString(raw.disposition, MAX_DISPOSITION_LENGTH),
    documentPath: toPath(raw["document-uri"]),
    effectiveDirective: capString(raw["effective-directive"], MAX_DIRECTIVE_LENGTH),
    lineNumber: toLineNumber(raw["line-number"]),
    sourceFile: toPath(raw["source-file"]),
  };
}

function compactReportingApi(raw: Record<string, unknown>): CompactedCspViolation {
  return {
    blockedOriginPath: toOriginAndPath(raw.blockedURL),
    disposition: capString(raw.disposition, MAX_DISPOSITION_LENGTH),
    documentPath: toPath(raw.documentURL),
    effectiveDirective: capString(raw.effectiveDirective, MAX_DIRECTIVE_LENGTH),
    lineNumber: toLineNumber(raw.lineNumber),
    sourceFile: toPath(raw.sourceFile),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Removes keys whose value is `undefined`, so the event payload stays small. */
function prune(violation: CompactedCspViolation): CompactedCspViolation {
  return Object.fromEntries(
    Object.entries(violation).filter(([, value]) => value !== undefined),
  ) as CompactedCspViolation;
}

/**
 * Reads a report body in either supported shape.
 *
 * @param payload - Parsed JSON body.
 * @param fallbackHost - Host to key the event on when the report names none.
 * @returns `null` when the body carries no recognisable violation.
 */
export function compactCspReport(
  payload: unknown,
  fallbackHost = "unknown",
): CompactedCspReport | null {
  const violations: CompactedCspViolation[] = [];
  let documentHost: string | undefined;

  if (isRecord(payload) && isRecord(payload["csp-report"])) {
    const raw = payload["csp-report"];
    documentHost = hostOf(raw["document-uri"]);
    violations.push(compactLegacy(raw));
  } else if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (!isRecord(entry)) {
        continue;
      }
      // A browser batches other report types into the same array.
      if (entry.type !== undefined && entry.type !== "csp-violation") {
        continue;
      }
      const raw = isRecord(entry.body) ? entry.body : entry;
      documentHost ??= hostOf(raw.documentURL);
      violations.push(compactReportingApi(raw));
      if (violations.length >= MAX_VIOLATIONS) {
        break;
      }
    }
  }

  if (violations.length === 0) {
    return null;
  }

  return {
    siteHost: capString(documentHost ?? fallbackHost, MAX_HOST_LENGTH) ?? "unknown",
    violations: violations.slice(0, MAX_VIOLATIONS).map(prune),
  };
}
