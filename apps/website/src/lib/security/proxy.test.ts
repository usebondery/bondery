import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { config, proxy } from "../../proxy.js";

function requestFor(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "https://www.example.test"));
}

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

describe("website proxy", () => {
  it("exports the Next.js config matcher, not proxyConfig", async () => {
    const module = (await import("../../proxy.js")) as Record<string, unknown>;

    assert.equal(module.proxyConfig, undefined, "proxyConfig is silently ignored by Next.js");
    assert.equal(Array.isArray(config.matcher), true);
  });

  it("sets a CSP with a script nonce and strict-dynamic", async () => {
    const response = proxy(requestFor("/"));
    const policy = parsePolicy(response.headers.get("Content-Security-Policy") ?? "");
    const scriptSrc = policy.get("script-src") ?? [];

    assert.equal(scriptSrc.includes("'unsafe-inline'"), false);
    assert.equal(scriptSrc.includes("'strict-dynamic'"), true);
    assert.equal(
      scriptSrc.some((source) => source.startsWith("'nonce-")),
      true,
    );
  });

  it("keeps the Mantine inline-style allowance", async () => {
    const response = proxy(requestFor("/"));
    const policy = parsePolicy(response.headers.get("Content-Security-Policy") ?? "");

    assert.deepEqual(policy.get("style-src"), ["'self'", "'unsafe-inline'"]);
  });

  it("keeps the GitHub API and Plausible connections the site needs", async () => {
    const response = proxy(requestFor("/"));
    const policy = parsePolicy(response.headers.get("Content-Security-Policy") ?? "");

    assert.equal(policy.get("connect-src")?.includes("https://api.github.com"), true);
    assert.equal(policy.get("img-src")?.includes("https://icons.duckduckgo.com"), true);
  });

  it("never allows a wildcard source", async () => {
    const response = proxy(requestFor("/"));

    assert.equal((response.headers.get("Content-Security-Policy") ?? "").includes("*"), false);
  });

  it("keeps require-trusted-types-for out of the enforced policy", async () => {
    const response = proxy(requestFor("/"));
    const enforced = parsePolicy(response.headers.get("Content-Security-Policy") ?? "");

    assert.equal(enforced.has("require-trusted-types-for"), false);
  });

  it("reports Trusted Types violations in the report-only policy", async () => {
    const response = proxy(requestFor("/"));
    const reportOnly = response.headers.get("Content-Security-Policy-Report-Only");

    assert.ok(reportOnly, "expected a report-only policy");
    const policy = parsePolicy(reportOnly);

    assert.deepEqual(policy.get("require-trusted-types-for"), ["'script'"]);
    assert.deepEqual(policy.get("trusted-types"), ["nextjs"]);
    assert.deepEqual(policy.get("base-uri"), ["'none'"]);
  });

  it("forwards the nonce and the policy on the request", async () => {
    const response = proxy(requestFor("/"));
    const csp = response.headers.get("Content-Security-Policy") ?? "";

    assert.match(csp, /'nonce-[^']+'/);
    assert.equal(response.headers.get("X-Frame-Options"), null);
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  });
});
