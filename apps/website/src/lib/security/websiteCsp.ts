import {
  buildCsp,
  createNonce,
  resolveCspReportEndpoint,
  WEBAPP_TRUSTED_TYPES_POLICIES,
} from "@bondery/helpers/security";

/**
 * Self-hosted Plausible origin for the analytics script.
 *
 * Plausible ships from its own host, so the origin comes from env. The
 * production default keeps the policy valid when the var is unset.
 */
function getPlausibleCspOrigin(): string {
  const host = process.env.BONDERY_PUBLIC_PLAUSIBLE_HOST?.trim();
  if (host) {
    try {
      return new URL(host).origin;
    } catch {
      // Fall through to production default.
    }
  }
  return "https://plausible.usebondery.com";
}

export type WebsiteCsp = {
  csp: string;
  nonce: string;
  reportEndpoint?: string;
  reportOnlyCsp: string;
};

/**
 * Builds the website policies.
 *
 * Both variants come from the shared builder, so the enforced and report-only
 * policies cannot drift.
 *
 * `require-trusted-types-for` stays out of the enforced policy. React
 * hydration sets `innerHTML` and `script.src` with plain strings, so the
 * directive stops the client render and leaves an empty body. The directive
 * appears only in the report-only policy, which collects the violations needed
 * before enforcement.
 *
 * `style-src` needs `'unsafe-inline'` in the enforced policy. Mantine writes
 * inline `style` attributes and the server sends `<style>` tags without a
 * nonce, so a nonce-only rule drops every page style.
 */
export function buildWebsiteCsp(): WebsiteCsp {
  const nonce = createNonce();
  const isDev = process.env.NODE_ENV === "development";
  const plausibleOrigin = getPlausibleCspOrigin();
  const reportEndpoint = resolveCspReportEndpoint();

  const shared = {
    connectSrc: ["https://api.github.com", plausibleOrigin],
    imgSrc: ["https://icons.duckduckgo.com"],
    isDev,
    nonce,
    reportEndpoint,
    scriptSrc: [plausibleOrigin],
  } as const;

  return {
    csp: buildCsp({ ...shared, variant: "enforced" }),
    nonce,
    reportEndpoint,
    /**
     * Trusted Types is report-only and always on. A browser enforces the
     * directive even from a report-only header, and the site satisfies it
     * without a registered policy. Do not register a `default` policy here:
     * see `apps/webapp/src/lib/security/proxyHeaders.ts` for the measured
     * failure it caused in Next's head manager.
     */
    reportOnlyCsp: buildCsp({
      ...shared,
      trustedTypes: WEBAPP_TRUSTED_TYPES_POLICIES,
      variant: "report-only",
    }),
  };
}
