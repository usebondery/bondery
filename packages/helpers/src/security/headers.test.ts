import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CSP_REPORT_GROUP } from "./csp.js";
import { buildSecurityHeaders } from "./headers.js";

const CSP = "default-src 'self'";

describe("buildSecurityHeaders", () => {
  it("always writes the baseline headers and the enforced policy", () => {
    const headers = buildSecurityHeaders({ csp: CSP });

    assert.equal(headers["Content-Security-Policy"], CSP);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.equal(headers["Cross-Origin-Opener-Policy"], "same-origin");
    assert.match(headers["Permissions-Policy"], /geolocation=\(self\)/);
  });

  it("never writes X-Frame-Options", () => {
    const headers = buildSecurityHeaders({ csp: CSP });

    assert.equal(headers["X-Frame-Options"], undefined);
  });

  it("adds the report-only policy only when one is supplied", () => {
    const headers = buildSecurityHeaders({ csp: CSP, reportOnlyCsp: "default-src 'self'" });

    assert.equal(headers["Content-Security-Policy-Report-Only"], "default-src 'self'");
    assert.equal(
      buildSecurityHeaders({ csp: CSP })["Content-Security-Policy-Report-Only"],
      undefined,
    );
  });

  it("omits Reporting-Endpoints when no endpoint is configured", () => {
    const headers = buildSecurityHeaders({ csp: CSP });

    assert.equal(headers["Reporting-Endpoints"], undefined);
  });

  it("writes Reporting-Endpoints for the shared report group", () => {
    const reportEndpoint = "https://api.example.test/security/csp-report";
    const headers = buildSecurityHeaders({ csp: CSP, reportEndpoint });

    assert.equal(headers["Reporting-Endpoints"], `${CSP_REPORT_GROUP}="${reportEndpoint}"`);
  });

  it("wraps a multi-line policy value unchanged", () => {
    const policy = "default-src 'self'; script-src 'self' 'nonce-abc'";
    const headers = buildSecurityHeaders({ csp: policy });

    assert.equal(headers["Content-Security-Policy"], policy);
  });
});
