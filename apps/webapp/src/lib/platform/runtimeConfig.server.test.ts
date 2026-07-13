import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEBAPP_RUNTIME_ENV } from "./runtimeConfig.env.js";
import {
  buildWebappRuntimeConfigFromEnv,
  validateWebappRuntimeConfigAtStartup,
} from "./runtimeConfig.server.js";

describe("webapp runtime config", () => {
  it("builds a strict allowlisted config from env", () => {
    const previous = { ...process.env };

    process.env[WEBAPP_RUNTIME_ENV.apiUrl] = "https://api.example.com";
    process.env[WEBAPP_RUNTIME_ENV.webappUrl] = "https://app.example.com";
    process.env[WEBAPP_RUNTIME_ENV.websiteUrl] = "https://example.com";
    process.env[WEBAPP_RUNTIME_ENV.supabaseUrl] = "https://xyz.supabase.co";
    process.env[WEBAPP_RUNTIME_ENV.supabasePublishableKey] = "sb_publishable_test";
    process.env[WEBAPP_RUNTIME_ENV.posthogKey] = "";
    process.env[WEBAPP_RUNTIME_ENV.posthogHost] = "";
    process.env.PRIVATE_SHOULD_NOT_LEAK = "nope";

    const cfg = buildWebappRuntimeConfigFromEnv();
    assert.equal(cfg.apiBaseUrl, "https://api.example.com");
    assert.equal(cfg.webappUrl, "https://app.example.com");
    assert.equal(cfg.websiteUrl, "https://example.com");
    assert.equal(cfg.supabaseUrl, "https://xyz.supabase.co");
    assert.equal(cfg.supabasePublishableKey, "sb_publishable_test");
    assert.equal("PRIVATE_SHOULD_NOT_LEAK" in (cfg as Record<string, unknown>), false);

    process.env = previous;
  });

  it("rejects Docker build placeholders in production", () => {
    const previous = { ...process.env, NODE_ENV: process.env.NODE_ENV };

    process.env.NODE_ENV = "production";
    process.env[WEBAPP_RUNTIME_ENV.apiUrl] = "https://api.example.com";
    process.env[WEBAPP_RUNTIME_ENV.webappUrl] = "https://app.example.com";
    process.env[WEBAPP_RUNTIME_ENV.websiteUrl] = "https://example.com";
    process.env[WEBAPP_RUNTIME_ENV.supabaseUrl] = "https://example.supabase.co";
    process.env[WEBAPP_RUNTIME_ENV.supabasePublishableKey] = "build-placeholder";

    assert.throws(() => validateWebappRuntimeConfigAtStartup(), /Invalid webapp runtime config/);

    process.env = previous;
  });
});
