import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveOAuthClientLogoUri } from "./oauth-client-logo-uri.js";

describe("resolveOAuthClientLogoUri", () => {
  it("returns HTTPS URLs unchanged", () => {
    assert.equal(
      resolveOAuthClientLogoUri("https://claude.ai/favicon.ico"),
      "https://claude.ai/favicon.ico",
    );
  });

  it("rejects non-HTTPS and empty values", () => {
    assert.equal(resolveOAuthClientLogoUri("http://example.com/icon.png"), null);
    assert.equal(resolveOAuthClientLogoUri(""), null);
    assert.equal(resolveOAuthClientLogoUri(null), null);
  });
});
