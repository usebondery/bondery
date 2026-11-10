import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCspReportEnabled, resolveCspReportEndpoint } from "./csp-report-endpoint.js";

const REPORT_PATH = "/security/csp-report";

describe("resolveCspReportEndpoint", () => {
  it("derives the endpoint from the API URL", () => {
    assert.equal(
      resolveCspReportEndpoint({ BONDERY_PUBLIC_API_URL: "https://api.usebondery.com" }),
      `https://api.usebondery.com${REPORT_PATH}`,
    );
  });

  it("drops a trailing slash on the API URL", () => {
    assert.equal(
      resolveCspReportEndpoint({ BONDERY_PUBLIC_API_URL: "https://api.usebondery.com/" }),
      `https://api.usebondery.com${REPORT_PATH}`,
    );
  });

  it("keeps a non-default port", () => {
    assert.equal(
      resolveCspReportEndpoint({ BONDERY_PUBLIC_API_URL: "http://localhost:26631" }),
      `http://localhost:26631${REPORT_PATH}`,
    );
  });

  it("is on by default", () => {
    assert.equal(isCspReportEnabled({}), true);
    assert.equal(
      resolveCspReportEndpoint({ BONDERY_PUBLIC_API_URL: "https://api.example.test" }) !==
        undefined,
      true,
    );
  });

  it("treats any value other than false as on", () => {
    for (const value of ["true", "TRUE", "1", "", "  ", "yes"]) {
      assert.equal(
        isCspReportEnabled({ BONDERY_PUBLIC_CSP_REPORT_ENABLED: value }),
        true,
        `expected ${JSON.stringify(value)} to keep reporting on`,
      );
    }
  });

  it("disables reporting only on an explicit false", () => {
    for (const value of ["false", "FALSE", " false "]) {
      assert.equal(
        isCspReportEnabled({ BONDERY_PUBLIC_CSP_REPORT_ENABLED: value }),
        false,
        `expected ${JSON.stringify(value)} to disable reporting`,
      );
      assert.equal(
        resolveCspReportEndpoint({
          BONDERY_PUBLIC_API_URL: "https://api.usebondery.com",
          BONDERY_PUBLIC_CSP_REPORT_ENABLED: value,
        }),
        undefined,
      );
    }
  });

  it("returns undefined when the API URL is missing or unparseable", () => {
    assert.equal(resolveCspReportEndpoint({}), undefined);
    assert.equal(resolveCspReportEndpoint({ BONDERY_PUBLIC_API_URL: "   " }), undefined);
    assert.equal(resolveCspReportEndpoint({ BONDERY_PUBLIC_API_URL: "not-a-url" }), undefined);
  });

  it("never points at the wrong origin", () => {
    // The endpoint must always share the API origin, so a report cannot be
    // posted to a host the API does not serve.
    const endpoint = resolveCspReportEndpoint({
      BONDERY_PUBLIC_API_URL: "https://api.beta.usebondery.com",
    });
    assert.equal(new URL(endpoint as string).origin, "https://api.beta.usebondery.com");
  });
});
