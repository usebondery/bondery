import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { config, proxy } from "../../proxy.js";
import { buildWebappProxyHeaders } from "./proxyHeaders.js";

function requestFor(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "https://app.example.test"));
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

describe("webapp proxy", () => {
  it("exports the Next.js config matcher, not proxyConfig", async () => {
    const module = (await import("../../proxy.js")) as Record<string, unknown>;

    assert.equal(module.proxyConfig, undefined, "proxyConfig is silently ignored by Next.js");
    assert.deepEqual(config.matcher, [
      "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ]);
  });

  it("sets a CSP on the response with a script nonce", async () => {
    // No session cookie, so `updateSession` takes its simplest path.
    const response = await proxy(requestFor("/login"));
    const csp = response.headers.get("Content-Security-Policy");

    assert.ok(csp, "expected a Content-Security-Policy header");
    const policy = parsePolicy(csp);

    const scriptSrc = policy.get("script-src") ?? [];
    assert.equal(scriptSrc.includes("'unsafe-inline'"), false);
    assert.equal(scriptSrc.includes("'strict-dynamic'"), true);
    assert.equal(
      scriptSrc.some((source) => source.startsWith("'nonce-")),
      true,
    );
  });

  it("keeps the Mantine inline-style allowance", async () => {
    const response = await proxy(requestFor("/login"));
    const policy = parsePolicy(response.headers.get("Content-Security-Policy") ?? "");

    assert.deepEqual(policy.get("style-src"), ["'self'", "'unsafe-inline'"]);
  });

  it("never allows a wildcard source", async () => {
    const response = await proxy(requestFor("/login"));
    const csp = response.headers.get("Content-Security-Policy") ?? "";

    assert.equal(csp.includes("*"), false);
  });

  it("sends the report-only policy with Trusted Types and no report target by default", async () => {
    const response = await proxy(requestFor("/login"));
    const reportOnly = response.headers.get("Content-Security-Policy-Report-Only");

    assert.ok(reportOnly, "expected a report-only policy");
    const policy = parsePolicy(reportOnly);

    // Trusted Types is always report-only. A browser enforces the directive
    // even from this header, and the app satisfies it without a registered
    // default policy. Measured on /login: all sinks succeed and no error
    // dialog appears. Registering a `default` policy causes Next's head
    // manager to null-deref on `cloneNode`, so `bondery#default` must not
    // appear here.
    assert.deepEqual(policy.get("require-trusted-types-for"), ["'script'"]);
    assert.deepEqual(policy.get("trusted-types"), ["nextjs"]);
    assert.equal(policy.get("trusted-types")?.includes("bondery#default"), false);
    assert.deepEqual(policy.get("base-uri"), ["'none'"]);
    assert.equal(policy.has("report-uri"), false);
    assert.equal(response.headers.get("Reporting-Endpoints"), null);
  });

  it("keeps Trusted Types out of the enforced policy", async () => {
    const response = await proxy(requestFor("/login"));
    const enforced = parsePolicy(response.headers.get("Content-Security-Policy") ?? "");

    assert.equal(enforced.has("require-trusted-types-for"), false);
  });

  it("writes the baseline headers and no X-Frame-Options", async () => {
    const response = await proxy(requestFor("/login"));

    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(response.headers.get("Cross-Origin-Opener-Policy"), "same-origin");
    assert.equal(response.headers.get("X-Frame-Options"), null);
  });

  it("allows the storage origin so avatars can load", () => {
    // Contact and profile avatars come from the API as absolute URLs built on
    // `BONDERY_PUBLIC_STORAGE_URL`. An absent origin blocks every avatar with a
    // CSP violation and no fallback, because Mantine renders the image, not an
    // initials block.
    const { headers } = buildWebappProxyHeaders({
      BONDERY_PUBLIC_STORAGE_URL: "http://127.0.0.1:8333",
      NODE_ENV: "development",
    });
    const policy = parsePolicy(headers["Content-Security-Policy"] ?? "");

    assert.equal(policy.get("img-src")?.includes("http://127.0.0.1:8333"), true);
  });

  it("omits the storage origin when the variable is unset", () => {
    const { headers } = buildWebappProxyHeaders({ NODE_ENV: "development" });
    const policy = parsePolicy(headers["Content-Security-Policy"] ?? "");

    assert.equal(policy.get("img-src")?.includes("undefined"), false);
    assert.equal(policy.get("img-src")?.includes(""), false);
  });

  it("forwards the nonce to the server render", async () => {
    const request = requestFor("/login");
    const response = await proxy(request);
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];

    assert.ok(nonce, "expected a nonce in the policy");
    assert.equal(response.headers.get("x-nonce"), null, "x-nonce is a request header");
  });
});
