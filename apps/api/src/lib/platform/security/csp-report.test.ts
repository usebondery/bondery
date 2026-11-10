import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compactCspReport } from "./csp-report.js";

const DOCUMENT_URL = "https://app.example.test/app/people?search=alice&token=secret";

describe("compactCspReport", () => {
  it("reads the legacy csp-report shape", () => {
    const report = compactCspReport({
      "csp-report": {
        "blocked-uri": "https://cdn.example.test/bundle.js?v=1",
        disposition: "enforce",
        "document-uri": DOCUMENT_URL,
        "effective-directive": "script-src-elem",
        "line-number": 42,
        "source-file": "https://app.example.test/_next/static/chunk.js?x=1",
      },
    });

    assert.ok(report);
    assert.equal(report.siteHost, "app.example.test");
    const [violation] = report.violations;

    assert.equal(violation?.effectiveDirective, "script-src-elem");
    assert.equal(violation?.disposition, "enforce");
    assert.equal(violation?.lineNumber, 42);
  });

  it("reads the Reporting API array shape", () => {
    const report = compactCspReport([
      {
        body: {
          blockedURL: "inline",
          disposition: "report",
          documentURL: DOCUMENT_URL,
          effectiveDirective: "style-src-attr",
          lineNumber: 7,
        },
        type: "csp-violation",
      },
    ]);

    assert.ok(report);
    assert.equal(report.violations.length, 1);
    assert.equal(report.violations[0]?.blockedOriginPath, "inline");
    assert.equal(report.violations[0]?.effectiveDirective, "style-src-attr");
  });

  it("strips the query string from the document and blocked URLs", () => {
    const report = compactCspReport({
      "csp-report": {
        "blocked-uri": "https://cdn.example.test/bundle.js?v=1#fragment",
        "document-uri": DOCUMENT_URL,
        "effective-directive": "script-src",
        "source-file": "https://app.example.test/chunk.js?x=1",
      },
    });

    assert.ok(report);
    const [violation] = report.violations;

    assert.equal(violation?.documentPath, "/app/people");
    assert.equal(violation?.blockedOriginPath, "https://cdn.example.test/bundle.js");
    assert.equal(violation?.sourceFile, "/chunk.js");
    assert.equal(JSON.stringify(report).includes("secret"), false);
    assert.equal(JSON.stringify(report).includes("v=1"), false);
  });

  it("drops the sample field", () => {
    const report = compactCspReport({
      "csp-report": {
        "document-uri": DOCUMENT_URL,
        "effective-directive": "script-src",
        sample: "<div>alice@example.test</div>",
      },
    });

    assert.ok(report);
    assert.equal(JSON.stringify(report).includes("alice@example.test"), false);
    assert.equal("sample" in (report.violations[0] ?? {}), false);
  });

  it("keeps only the first 20 violations in a Reporting API batch", () => {
    const payload = Array.from({ length: 40 }, () => ({
      body: { documentURL: DOCUMENT_URL, effectiveDirective: "script-src" },
      type: "csp-violation",
    }));

    const report = compactCspReport(payload);

    assert.ok(report);
    assert.equal(report.violations.length, 20);
  });

  it("ignores report types other than csp-violation", () => {
    const report = compactCspReport([
      { body: { foo: "bar" }, type: "deprecation" },
      { body: { documentURL: DOCUMENT_URL, effectiveDirective: "img-src" }, type: "csp-violation" },
    ]);

    assert.ok(report);
    assert.equal(report.violations.length, 1);
    assert.equal(report.violations[0]?.effectiveDirective, "img-src");
  });

  it("returns null for a body with no recognisable violation", () => {
    assert.equal(compactCspReport(null), null);
    assert.equal(compactCspReport({}), null);
    assert.equal(compactCspReport("nope"), null);
    assert.equal(compactCspReport([]), null);
    assert.equal(compactCspReport([{ body: {}, type: "deprecation" }]), null);
  });

  it("falls back to the request host when the report names none", () => {
    const report = compactCspReport(
      { "csp-report": { "effective-directive": "script-src" } },
      "fallback.example.test",
    );

    assert.ok(report);
    assert.equal(report.siteHost, "fallback.example.test");
  });

  it("caps long directive and disposition strings", () => {
    const report = compactCspReport({
      "csp-report": {
        disposition: "y".repeat(500),
        "effective-directive": "x".repeat(500),
      },
    });

    assert.ok(report);
    assert.equal(report.violations[0]?.effectiveDirective?.length, 64);
    assert.equal(report.violations[0]?.disposition?.length, 16);
  });

  it("accepts a non-negative integer line number only", () => {
    const valid = compactCspReport({
      "csp-report": { "effective-directive": "script-src", "line-number": 0 },
    });
    const invalid = compactCspReport({
      "csp-report": { "effective-directive": "script-src", "line-number": -3 },
    });

    assert.equal(valid?.violations[0]?.lineNumber, 0);
    assert.equal(invalid?.violations[0]?.lineNumber, undefined);
  });
});
