import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  chromeExtensionOrigin,
  isAllowedRequestOrigin,
  resolveTrustedOrigins,
  withCorsHeaders,
} from "./trusted-origins.js";

describe("resolveTrustedOrigins", () => {
  it("includes webapp, website, expo scheme, and extra origins", () => {
    const origins = resolveTrustedOrigins({
      extraAllowedOrigins: "http://localhost:26634,http://192.168.1.10:26632",
      webappUrl: "http://localhost:26632/",
      websiteUrl: "http://localhost:26630",
    });

    assert.ok(origins.includes("http://localhost:26632"));
    assert.ok(origins.includes("http://localhost:26630"));
    assert.ok(origins.includes("bondery://"));
    assert.ok(origins.includes("http://localhost:26634"));
    assert.ok(origins.includes("http://192.168.1.10:26632"));
  });

  it("adds localhost port wildcards only in local dev mode", () => {
    const origins = resolveTrustedOrigins({
      allowLocalDevOrigins: true,
      webappUrl: "http://localhost:26632",
    });

    assert.ok(origins.includes("http://localhost:*"));
    assert.ok(origins.includes("http://127.0.0.1:*"));
    assert.ok(origins.includes("exp://"));
    assert.ok(origins.includes("exp+bondery://"));
  });

  it("does not trust Expo Dev Client origins in production allowlists", () => {
    const origins = resolveTrustedOrigins({
      webappUrl: "https://app.example.com",
    });

    assert.equal(origins.includes("exp://"), false);
    assert.equal(origins.includes("exp+bondery://"), false);
  });

  it("allows the pinned Chrome extension origin for token CORS", () => {
    const origins = resolveTrustedOrigins({
      chromeExtensionId: "lpcmokfekjjejnpobhbkgmjkodfhpmha",
      webappUrl: "https://app.example.com",
    });

    assert.ok(origins.includes("chrome-extension://lpcmokfekjjejnpobhbkgmjkodfhpmha"));
  });
});

describe("chromeExtensionOrigin", () => {
  it("rejects ids that are not a 32-character Chrome item id", () => {
    assert.equal(chromeExtensionOrigin("not-an-id"), undefined);
    assert.equal(chromeExtensionOrigin(""), undefined);
  });
});

describe("isAllowedRequestOrigin", () => {
  const devOrigins = resolveTrustedOrigins({
    allowLocalDevOrigins: true,
    webappUrl: "http://localhost:26632",
  });

  it("allows Cursor-forwarded localhost ports in development", () => {
    assert.equal(isAllowedRequestOrigin("http://localhost:49171", devOrigins), true);
  });

  it("rejects unknown origins in production allowlist", () => {
    const prodOrigins = resolveTrustedOrigins({
      webappUrl: "https://app.example.com",
    });

    assert.equal(isAllowedRequestOrigin("http://localhost:49171", prodOrigins), false);
  });
});

describe("withCorsHeaders", () => {
  it("adds ACAO and credentials headers for allowed cross-origin auth responses", () => {
    const devOrigins = resolveTrustedOrigins({
      allowLocalDevOrigins: true,
      webappUrl: "http://localhost:26632",
    });
    const response = new Response(JSON.stringify({ url: "https://github.com" }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });

    const corsResponse = withCorsHeaders(
      { headers: { origin: "http://localhost:62128" } },
      response,
      devOrigins,
    );

    assert.equal(corsResponse.headers.get("Access-Control-Allow-Origin"), "http://localhost:62128");
    assert.equal(corsResponse.headers.get("Access-Control-Allow-Credentials"), "true");
  });

  it("reflects the Chrome extension origin so PKCE token exchange can read a 200 body", () => {
    const origins = resolveTrustedOrigins({
      chromeExtensionId: "lpcmokfekjjejnpobhbkgmjkodfhpmha",
      webappUrl: "http://localhost:26632",
    });
    const response = new Response(JSON.stringify({ access_token: "x" }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });

    const corsResponse = withCorsHeaders(
      { headers: { origin: "chrome-extension://lpcmokfekjjejnpobhbkgmjkodfhpmha" } },
      response,
      origins,
    );

    assert.equal(
      corsResponse.headers.get("Access-Control-Allow-Origin"),
      "chrome-extension://lpcmokfekjjejnpobhbkgmjkodfhpmha",
    );
  });
});
