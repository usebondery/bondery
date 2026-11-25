import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  joinApiUrl,
  normalizeApiBaseUrl,
  resolvePublicApiBaseUrl,
  resolveServerApiBaseUrl,
} from "../api/resolveServerApiUrl.js";
import {
  WEBAPP_INTERNAL_API_URL_ENV,
  WEBAPP_RUNTIME_BUILD_PLACEHOLDERS,
  WEBAPP_RUNTIME_ENV,
} from "./runtimeConfig.env.js";
import {
  buildWebappRuntimeConfigFromEnv,
  validateWebappRuntimeConfigAtStartup,
} from "./runtimeConfig.server.js";

const INVALID_WEBAPP_RUNTIME_CONFIG = /Invalid webapp runtime config/u;

describe("webapp runtime config", () => {
  it("builds a strict allowlisted config from env", () => {
    const previous = { ...process.env };

    process.env[WEBAPP_RUNTIME_ENV.apiUrl] = "https://api.example.com";
    process.env[WEBAPP_RUNTIME_ENV.webappUrl] = "https://app.example.com";
    process.env[WEBAPP_RUNTIME_ENV.websiteUrl] = "https://example.com";
    process.env[WEBAPP_RUNTIME_ENV.posthogKey] = "";
    process.env[WEBAPP_RUNTIME_ENV.posthogHost] = "";
    process.env["PRIVATE_SHOULD_NOT_LEAK"] = "nope";
    process.env[WEBAPP_INTERNAL_API_URL_ENV] = "http://api:26631";

    const cfg = buildWebappRuntimeConfigFromEnv();
    assert.equal(cfg.apiBaseUrl, "https://api.example.com");
    assert.equal(cfg.webappUrl, "https://app.example.com");
    assert.equal(cfg.websiteUrl, "https://example.com");
    assert.equal("PRIVATE_SHOULD_NOT_LEAK" in (cfg as unknown as Record<string, unknown>), false);
    assert.equal(WEBAPP_INTERNAL_API_URL_ENV in (cfg as unknown as Record<string, unknown>), false);
    assert.equal(
      JSON.stringify(cfg).includes("http://api:26631"),
      false,
      "internal API URL must never appear in public runtime config",
    );

    process.env = previous;
  });

  it("rejects Docker build placeholders in production", () => {
    const previous = { ...process.env };

    process.env = { ...process.env, NODE_ENV: "production" };
    process.env[WEBAPP_RUNTIME_ENV.apiUrl] = WEBAPP_RUNTIME_BUILD_PLACEHOLDERS.apiUrl;
    process.env[WEBAPP_RUNTIME_ENV.webappUrl] = "https://app.example.com";
    process.env[WEBAPP_RUNTIME_ENV.websiteUrl] = "https://example.com";

    assert.throws(() => validateWebappRuntimeConfigAtStartup(), INVALID_WEBAPP_RUNTIME_CONFIG);

    process.env = previous;
  });
});

describe("resolveServerApiBaseUrl", () => {
  it("prefers BONDERY_INFRA_INTERNAL_API_URL when set", () => {
    const base = resolveServerApiBaseUrl({
      [WEBAPP_INTERNAL_API_URL_ENV]: "http://api:26631/",
      [WEBAPP_RUNTIME_ENV.apiUrl]: "https://api.example.com",
    });
    assert.equal(base, "http://api:26631");
  });

  it("falls back to BONDERY_PUBLIC_API_URL when internal is unset", () => {
    const base = resolveServerApiBaseUrl({
      [WEBAPP_RUNTIME_ENV.apiUrl]: "https://api.example.com/api",
    });
    assert.equal(base, "https://api.example.com");
  });
});

describe("resolvePublicApiBaseUrl", () => {
  it("always uses BONDERY_PUBLIC_API_URL even when internal URL is set", () => {
    const base = resolvePublicApiBaseUrl({
      [WEBAPP_INTERNAL_API_URL_ENV]: "http://api:26631",
      [WEBAPP_RUNTIME_ENV.apiUrl]: "https://api.example.com",
    });
    assert.equal(base, "https://api.example.com");
  });

  it("normalizes trailing slashes and /api suffix", () => {
    assert.equal(normalizeApiBaseUrl("https://api.example.com/api/"), "https://api.example.com");
    assert.equal(
      joinApiUrl("https://api.example.com", "contacts"),
      "https://api.example.com/api/contacts",
    );
    assert.equal(
      joinApiUrl("https://api.example.com", "/api/extension/manifest"),
      "https://api.example.com/api/extension/manifest",
    );
  });
});
