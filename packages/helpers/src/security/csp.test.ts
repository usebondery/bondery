import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCsp, CSP_REPORT_GROUP } from "./csp.js";

/** Parses a policy string into directive name → sources. */
function parsePolicy(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entry of policy.split(";")) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const [name, ...sources] = trimmed.split(/\s+/);
    if (name) {
      map.set(name, sources);
    }
  }
  return map;
}

const NONCE = "dGVzdC1ub25jZQ==";

describe("buildCsp", () => {
  it("returns a single line with no trailing separator", () => {
    const policy = buildCsp({ nonce: NONCE, variant: "enforced" });

    assert.equal(policy.includes("\n"), false);
    assert.equal(policy.startsWith("default-src 'self'"), true);
    assert.equal(policy.endsWith("upgrade-insecure-requests"), true);
  });

  it("never puts unsafe-inline in the enforced script-src", () => {
    for (const variant of ["enforced", "report-only"] as const) {
      const policy = parsePolicy(buildCsp({ nonce: NONCE, variant }));
      const scriptSrc = policy.get("script-src") ?? [];

      assert.equal(scriptSrc.includes("'unsafe-inline'"), false, `${variant} script-src`);
      assert.equal(scriptSrc.includes(`'nonce-${NONCE}'`), true, `${variant} script-src nonce`);
      assert.equal(scriptSrc.includes("'strict-dynamic'"), true, `${variant} strict-dynamic`);
    }
  });

  it("keeps unsafe-inline in the enforced style-src for Mantine", () => {
    const policy = parsePolicy(buildCsp({ nonce: NONCE, variant: "enforced" }));

    assert.deepEqual(policy.get("style-src"), ["'self'", "'unsafe-inline'"]);
  });

  it("drops unsafe-inline from style-src and tightens base-uri in report-only", () => {
    const enforced = parsePolicy(buildCsp({ nonce: NONCE, variant: "enforced" }));
    const reportOnly = parsePolicy(buildCsp({ nonce: NONCE, variant: "report-only" }));

    assert.deepEqual(reportOnly.get("style-src"), ["'self'", `'nonce-${NONCE}'`]);
    assert.deepEqual(enforced.get("base-uri"), ["'self'"]);
    assert.deepEqual(reportOnly.get("base-uri"), ["'none'"]);
  });

  it("changes only style-src and base-uri between variants", () => {
    const enforced = parsePolicy(buildCsp({ nonce: NONCE, variant: "enforced" }));
    const reportOnly = parsePolicy(buildCsp({ nonce: NONCE, variant: "report-only" }));

    assert.deepEqual([...enforced.keys()], [...reportOnly.keys()]);
    for (const [name, sources] of enforced) {
      if (name === "style-src" || name === "base-uri") {
        continue;
      }
      assert.deepEqual(reportOnly.get(name), sources, name);
    }
  });

  it("adds Trusted Types directives only to the report-only variant", () => {
    const trustedTypes = ["nextjs", "bondery#default"];
    const enforced = parsePolicy(buildCsp({ nonce: NONCE, trustedTypes, variant: "enforced" }));
    const reportOnly = parsePolicy(
      buildCsp({ nonce: NONCE, trustedTypes, variant: "report-only" }),
    );

    assert.equal(enforced.has("require-trusted-types-for"), false);
    assert.equal(enforced.has("trusted-types"), false);
    assert.deepEqual(reportOnly.get("require-trusted-types-for"), ["'script'"]);
    assert.deepEqual(reportOnly.get("trusted-types"), trustedTypes);
  });

  it("omits report directives when no endpoint is configured", () => {
    const policy = parsePolicy(buildCsp({ nonce: NONCE, variant: "enforced" }));

    assert.equal(policy.has("report-uri"), false);
    assert.equal(policy.has("report-to"), false);
  });

  it("points report directives at the endpoint and the shared group", () => {
    const reportEndpoint = "https://api.example.test/security/csp-report";
    const policy = parsePolicy(buildCsp({ nonce: NONCE, reportEndpoint, variant: "enforced" }));

    assert.deepEqual(policy.get("report-uri"), [reportEndpoint]);
    assert.deepEqual(policy.get("report-to"), [CSP_REPORT_GROUP]);
  });

  it("keeps the fixed hardening directives", () => {
    const policy = parsePolicy(
      buildCsp({ connectSrc: ["https://api.example.test"], nonce: NONCE, variant: "enforced" }),
    );

    assert.deepEqual(policy.get("object-src"), ["'none'"]);
    assert.deepEqual(policy.get("form-action"), ["'self'"]);
    assert.deepEqual(policy.get("frame-ancestors"), ["'none'"]);
    assert.deepEqual(policy.get("connect-src"), ["'self'", "https://api.example.test"]);
    assert.equal(policy.has("require-trusted-types-for"), false);
  });

  it("adds unsafe-eval only in development", () => {
    const dev = parsePolicy(buildCsp({ isDev: true, nonce: NONCE, variant: "enforced" }));
    const prod = parsePolicy(buildCsp({ isDev: false, nonce: NONCE, variant: "enforced" }));

    assert.equal(dev.get("script-src")?.includes("'unsafe-eval'"), true);
    assert.equal(prod.get("script-src")?.includes("'unsafe-eval'"), false);
  });

  it("de-duplicates repeated origins", () => {
    const policy = parsePolicy(
      buildCsp({
        connectSrc: ["https://api.example.test", "https://api.example.test"],
        nonce: NONCE,
        variant: "enforced",
      }),
    );

    assert.deepEqual(policy.get("connect-src"), ["'self'", "https://api.example.test"]);
  });

  it("writes frame-src only when the caller allows frames", () => {
    const withoutFrames = parsePolicy(buildCsp({ nonce: NONCE, variant: "enforced" }));
    const withFrames = parsePolicy(
      buildCsp({
        frameSrc: ["https://js.stripe.com"],
        nonce: NONCE,
        variant: "enforced",
      }),
    );

    assert.equal(withoutFrames.has("frame-src"), false);
    assert.deepEqual(withFrames.get("frame-src"), ["'self'", "https://js.stripe.com"]);
  });
});
