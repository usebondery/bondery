import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildWebappRuntimeConfigFromEnv } from "./runtimeConfig.server.js";

describe("webapp runtime config", () => {
  it("builds a strict allowlisted config from env", () => {
    const previous = { ...process.env };

    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_WEBAPP_URL = "https://app.example.com";
    process.env.NEXT_PUBLIC_WEBSITE_URL = "https://example.com";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xyz.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "";
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
});
