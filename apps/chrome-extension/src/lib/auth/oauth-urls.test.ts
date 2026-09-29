import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  loopbackHostPermissionPatterns,
  oauthHttpBaseUrl,
  oauthResourceIdentifier,
} from "./oauth-urls";

describe("oauthResourceIdentifier", () => {
  it("keeps localhost so it matches the provisioned API resource", () => {
    assert.equal(oauthResourceIdentifier("http://localhost:26631/"), "http://localhost:26631");
  });
});

describe("oauthHttpBaseUrl", () => {
  it("pins localhost HTTP to 127.0.0.1 for chrome.identity", () => {
    assert.equal(oauthHttpBaseUrl("http://localhost:26631"), "http://127.0.0.1:26631");
  });
});

describe("loopbackHostPermissionPatterns", () => {
  it("includes 127.0.0.1 when env is localhost so token fetch is privileged", () => {
    assert.deepEqual(loopbackHostPermissionPatterns("http://localhost:26631"), [
      "http://localhost/*",
      "http://127.0.0.1/*",
    ]);
  });

  it("leaves non-loopback origins unchanged", () => {
    assert.deepEqual(loopbackHostPermissionPatterns("https://api.example.com"), [
      "https://api.example.com/*",
    ]);
  });
});
