import {
  buildCsp,
  buildSecurityHeaders,
  CSP_REPORT_GROUP,
  createNonce,
  resolveCspReportEndpoint,
  WEBAPP_TRUSTED_TYPES_POLICIES,
} from "@bondery/helpers/security";

/**
 * Third-party origins the webapp actually contacts. Each entry names the file
 * that needs it, so a reviewer can delete the entry that a dependency change
 * orphaned.
 */

/** PostHog browser capture (`instrumentation-client.ts`). */
const POSTHOG_ORIGIN = "https://eu.i.posthog.com";
/** MapLibre vector tiles and style JSON (`components/map/openFreeMapStyle.ts`). */
const OPEN_FREE_MAP_ORIGIN = "https://tiles.openfreemap.org";
/** DuckDuckGo favicons for external links (`@bondery/mantine-next/ExternalLink`). */
const FAVICON_ORIGIN = "https://icons.duckduckgo.com";
/** Embedded Stripe Checkout script and iframe (`hooks/useEmbeddedCheckout.ts`). */
const STRIPE_SCRIPT_ORIGIN = "https://js.stripe.com";
const STRIPE_FRAME_ORIGIN = "https://js.stripe.com";

function originOf(rawUrl: string | undefined): string[] {
  const value = rawUrl?.trim();
  if (!value) {
    return [];
  }
  try {
    return [new URL(value).origin];
  } catch {
    return [];
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

export type WebappProxySecurityHeaders = {
  /** Enforced policy, also forwarded on the request so Next can read the nonce. */
  csp: string;
  /** Full header set for the proxy response. */
  headers: Record<string, string>;
  /** Nonce forwarded as `x-nonce` so the root layout can stamp scripts. */
  nonce: string;
};

/**
 * Builds the webapp security headers for one request.
 *
 * The enforced policy allows what the app loads today. The report-only policy
 * is the shape we intend to enforce later: `style-src` with the nonce only and
 * `base-uri 'none'`. It also collects Trusted Types violations, which is the
 * only way to learn what React needs before `require-trusted-types-for` can be
 * enforced.
 *
 * Read the env here rather than at module scope: `proxy.ts` runs per request
 * and the values differ between dev and deploy.
 */
export function buildWebappProxyHeaders(
  env: Record<string, string | undefined> = process.env,
): WebappProxySecurityHeaders {
  const nonce = createNonce();
  const isDev = env.NODE_ENV === "development";

  const apiOrigins = unique([
    ...originOf(env.BONDERY_PUBLIC_API_URL),
    // The webapp connects to the API over WebSocket for sync wake-ups.
    ...originOf(env.BONDERY_PUBLIC_API_URL).map((origin) =>
      origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
    ),
  ]);

  const connectSrc = unique([
    ...apiOrigins,
    POSTHOG_ORIGIN,
    OPEN_FREE_MAP_ORIGIN,
    STRIPE_SCRIPT_ORIGIN,
  ]);

  const imgSrc = unique([
    FAVICON_ORIGIN,
    OPEN_FREE_MAP_ORIGIN,
    // Contact avatars and LinkedIn logos (`lib/storage/avatar-urls.ts` in the API
    // builds them from `BONDERY_PUBLIC_STORAGE_URL`).
    ...originOf(env.BONDERY_PUBLIC_STORAGE_URL),
  ]);

  const reportEndpoint = resolveCspReportEndpoint(env);

  const csp = buildCsp({
    connectSrc,
    frameSrc: [STRIPE_FRAME_ORIGIN],
    imgSrc,
    isDev,
    nonce,
    reportEndpoint,
    variant: "enforced",
  });

  /**
   * Trusted Types runs in report-only mode, unconditionally.
   *
   * A browser enforces `require-trusted-types-for` even in a report-only
   * header, so this directive is live and the app must satisfy it. It does:
   * measured on `/login` with the directive active, React Compiler's
   * `new Function`, `script.text`, `script.src`, and `innerHTML` all succeed
   * and no error dialog appears.
   *
   * Do NOT register a `default` Trusted Types policy. Doing so broke Next's
   * head manager, which reads `cloneTag.nonce` on a clone whose nonce Trusted
   * Types had already stripped, and the null dereference surfaced as
   * `Cannot read properties of null (reading 'cloneNode')`. Without a
   * registered policy the same page renders clean. Trusted Types already
   * provides its own internal default policy, so registering one is
   * unnecessary as well as harmful.
   */
  const reportOnlyCsp = buildCsp({
    connectSrc,
    frameSrc: [STRIPE_FRAME_ORIGIN],
    imgSrc,
    isDev,
    nonce,
    reportEndpoint,
    trustedTypes: WEBAPP_TRUSTED_TYPES_POLICIES,
    variant: "report-only",
  });

  return {
    csp,
    headers: buildSecurityHeaders({ csp, reportEndpoint, reportOnlyCsp }),
    nonce,
  };
}

/** Report group name re-exported for tests and docs that assert the header. */
export { CSP_REPORT_GROUP };
