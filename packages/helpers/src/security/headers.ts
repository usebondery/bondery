import { CSP_REPORT_GROUP } from "./csp.js";

export type SecurityHeaderInput = {
  /** Enforced policy string from {@link buildCsp}. */
  csp: string;
  /** Report-only policy string from {@link buildCsp}. */
  reportOnlyCsp?: string;
  /**
   * Absolute URL of the CSP report endpoint. When absent, no
   * `Reporting-Endpoints` header is written and the policies carry no
   * `report-to` directive, so a self-host install without a collector stays
   * silent instead of pointing at a dead endpoint.
   */
  reportEndpoint?: string;
};

/**
 * Baseline response headers for every HTML surface.
 *
 * `frame-ancestors` in the policy decides framing. `X-Frame-Options` gives no
 * extra protection and a stale value contradicts the policy, so this module
 * never writes it.
 */
/**
 * `Permissions-Policy` value shared by every surface, the API included.
 *
 * The API sends it from an `onSend` hook because Helmet has no option for this
 * header. Keeping the string here means the three cannot drift apart.
 */
export const PERMISSIONS_POLICY = [
  "camera=()",
  "geolocation=(self)",
  "microphone=(self)",
  "payment=(self)",
  "usb=()",
  "serial=()",
  "hid=()",
].join(", ");

const BASE_HEADERS: Record<string, string> = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": PERMISSIONS_POLICY,
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Builds the complete header set for a proxy response.
 *
 * Every optional header is written only when its input exists.
 */
export function buildSecurityHeaders(input: SecurityHeaderInput): Record<string, string> {
  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    "Content-Security-Policy": input.csp,
  };

  if (input.reportOnlyCsp) {
    headers["Content-Security-Policy-Report-Only"] = input.reportOnlyCsp;
  }

  if (input.reportEndpoint) {
    headers["Reporting-Endpoints"] = `${CSP_REPORT_GROUP}="${input.reportEndpoint}"`;
  }

  return headers;
}
