import type { CompactedCspReport } from "../../lib/platform/security/csp-report.js";
import { getPosthogClient } from "./posthog-client.js";

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
  const posthogClient = getPosthogClient();
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
