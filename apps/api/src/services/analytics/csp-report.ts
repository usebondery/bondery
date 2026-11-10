import { PostHog } from "posthog-node";
import type { CompactedCspReport } from "../../lib/platform/security/csp-report.js";

const posthogKey = process.env.BONDERY_PUBLIC_POSTHOG_KEY ?? "";
const posthogHost = process.env.BONDERY_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

const posthogClient = posthogKey
  ? new PostHog(posthogKey, {
      flushAt: 1,
      flushInterval: 0,
      host: posthogHost,
    })
  : null;

/**
 * Forwards one compacted CSP report to PostHog.
 *
 * A CSP report has no authenticated user, so the distinct id is derived per
 * site. The per-user opt-out check in `posthog-capture.ts` needs a
 * `DomainContext`, which this path does not have, so it is not called here.
 *
 * Failures are swallowed: a browser that reports a violation must not see an
 * error, and the endpoint returns `204` either way.
 */
export async function captureCspReport(report: CompactedCspReport): Promise<void> {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.capture({
      distinctId: `csp-report:${report.siteHost}`,
      event: "security:csp_violation",
      properties: {
        site_host: report.siteHost,
        violation_count: report.violations.length,
        violations: report.violations,
      },
    });

    await posthogClient.flush();
  } catch {
    // Reporting is best-effort. A failed capture must not fail the request.
  }
}
