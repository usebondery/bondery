/**
 * Content-Security-Policy builder shared by every Next.js app.
 *
 * The builder is pure and Edge-safe: no Node built-ins, so `proxy.ts` can run
 * it on the Edge runtime.
 *
 * Both variants come from one function, so the enforced policy can never drift
 * from the report-only one. A call with `variant: "report-only"` changes
 * exactly three things and keeps every other directive:
 *
 * 1. `style-src` drops `'unsafe-inline'` and keeps the nonce.
 * 2. `base-uri` becomes `'none'`.
 * 3. `require-trusted-types-for` and `trusted-types` appear when the caller
 *    lists policy names.
 */

/** Report group name shared with the `Reporting-Endpoints` header. */
export const CSP_REPORT_GROUP = "default" as const;

/** Trusted Types policy names the webapp registers at runtime. */
export const WEBAPP_TRUSTED_TYPES_POLICIES = ["nextjs"] as const;

export type CspVariant = "enforced" | "report-only";

export type CspPolicyInput = {
  /** Per-request nonce from {@link createNonce}. */
  nonce: string;
  variant: CspVariant;
  /** Extra `script-src` origins, for example a first-party analytics host. */
  scriptSrc?: readonly string[];
  /** Extra `connect-src` origins: API, analytics, tile servers. */
  connectSrc?: readonly string[];
  /** Extra `img-src` origins: tile servers, favicon service, object storage. */
  imgSrc?: readonly string[];
  /** Extra `font-src` origins. `'self'` is always present. */
  fontSrc?: readonly string[];
  /**
   * Extra `frame-src` origins, for example an embedded checkout form. The
   * directive is omitted when this list is undefined, so an app without frames
   * sends no `frame-src` line.
   */
  frameSrc?: readonly string[];
  /** Append `'unsafe-eval'` to `script-src`. Development only. */
  isDev?: boolean;
  /**
   * Absolute URL of the CSP report endpoint. Omit for a self-host install with
   * no collector. When set, the policy gains `report-uri` and `report-to`.
   */
  reportEndpoint?: string;
  /**
   * Trusted Types policy allowlist. Report-only variant only. Leave undefined
   * to omit the directives.
   */
  trustedTypes?: readonly string[];
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

/** Joins a directive with its sources, dropping empty entries. */
function directive(name: string, values: readonly string[]): string {
  const parts = unique(values);
  return parts.length === 0 ? name : `${name} ${parts.join(" ")}`;
}

/**
 * Builds a complete policy string as one line, ready to send as a header
 * value.
 */
export function buildCsp(input: CspPolicyInput): string {
  const { nonce, variant, isDev = false, reportEndpoint } = input;
  const isReportOnly = variant === "report-only";

  const self = "'self'";
  const nonceSource = `'nonce-${nonce}'`;

  const scriptSrc = [self, nonceSource, "'strict-dynamic'", ...(input.scriptSrc ?? [])];
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  const styleSrc = isReportOnly ? [self, nonceSource] : [self, "'unsafe-inline'"];

  const directives = [
    directive("default-src", [self]),
    directive("script-src", scriptSrc),
    directive("style-src", styleSrc),
    directive("img-src", [self, "blob:", "data:", ...(input.imgSrc ?? [])]),
    directive("font-src", [self, ...(input.fontSrc ?? [])]),
    directive("connect-src", [self, ...(input.connectSrc ?? [])]),
    ...(input.frameSrc ? [directive("frame-src", [self, ...input.frameSrc])] : []),
    directive("object-src", ["'none'"]),
    directive("base-uri", [isReportOnly ? "'none'" : self]),
    directive("form-action", [self]),
    directive("frame-ancestors", ["'none'"]),
  ];

  if (isReportOnly && input.trustedTypes && input.trustedTypes.length > 0) {
    directives.push(directive("require-trusted-types-for", ["'script'"]));
    directives.push(directive("trusted-types", input.trustedTypes));
  }

  directives.push("upgrade-insecure-requests");

  if (reportEndpoint) {
    // `report-uri` still covers Safari, which ignores `Reporting-Endpoints`.
    directives.push(directive("report-uri", [reportEndpoint]));
    directives.push(directive("report-to", [CSP_REPORT_GROUP]));
  }

  return directives.join("; ");
}
