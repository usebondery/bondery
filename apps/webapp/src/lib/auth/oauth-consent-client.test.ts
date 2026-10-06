import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isFirstPartyOAuthClient,
  readOAuthPublicClientName,
  redirectUriIsLoopback,
  resolveFirstPartyConsentClientName,
  resolveThirdPartyConsentClientDisplay,
} from "./oauth-consent-client.js";

describe("resolveFirstPartyConsentClientName", () => {
  const names = {
    chromeExtensionClientId: "ext-id",
    chromeExtensionName: "Bondery Chrome Extension",
    unknownName: "Unknown application",
    webappClientId: "webapp-id",
    webappName: "Bondery",
  };

  it("labels the webapp BFF as Bondery, not the Chrome extension", () => {
    assert.equal(resolveFirstPartyConsentClientName("webapp-id", names), "Bondery");
  });

  it("labels the Chrome extension by its own name", () => {
    assert.equal(resolveFirstPartyConsentClientName("ext-id", names), "Bondery Chrome Extension");
  });

  it("does not fall back to the Chrome extension for unknown clients", () => {
    assert.equal(
      resolveFirstPartyConsentClientName("https://claude.ai/oauth/callback", names),
      "Unknown application",
    );
    assert.equal(
      resolveFirstPartyConsentClientName("some-other-client", names),
      "Unknown application",
    );
  });
});

describe("isFirstPartyOAuthClient", () => {
  const ids = { chromeExtensionClientId: "ext-id", webappClientId: "webapp-id" };

  it("matches only the provisioned first-party client ids", () => {
    assert.equal(isFirstPartyOAuthClient("webapp-id", ids), true);
    assert.equal(isFirstPartyOAuthClient("ext-id", ids), true);
    assert.equal(isFirstPartyOAuthClient("opaque-assistant-id", ids), false);
  });
});

describe("resolveThirdPartyConsentClientDisplay", () => {
  it("uses the registered name for an opaque client id", () => {
    assert.deepEqual(
      resolveThirdPartyConsentClientDisplay("opaque-assistant-id", "Cursor", "Unknown application"),
      { name: "Cursor" },
    );
  });

  it("falls back to the CIMD hostname when metadata has no name", () => {
    assert.deepEqual(
      resolveThirdPartyConsentClientDisplay(
        "https://claude.ai/oauth/callback",
        null,
        "Unknown application",
      ),
      { hostname: "claude.ai", name: "claude.ai" },
    );
  });

  it("prefers a fetched CIMD name over the hostname", () => {
    assert.deepEqual(
      resolveThirdPartyConsentClientDisplay(
        "https://claude.ai/oauth/callback",
        "Claude",
        "Unknown application",
      ),
      { hostname: "claude.ai", name: "Claude" },
    );
  });

  it("uses Unknown application when an opaque client has no name", () => {
    assert.deepEqual(
      resolveThirdPartyConsentClientDisplay("opaque-assistant-id", null, "Unknown application"),
      { name: "Unknown application" },
    );
  });
});

describe("readOAuthPublicClientName", () => {
  it("reads top-level and nested client_name", () => {
    assert.equal(readOAuthPublicClientName({ client_name: "Cursor" }), "Cursor");
    assert.equal(readOAuthPublicClientName({ client: { client_name: "Claude" } }), "Claude");
    assert.equal(readOAuthPublicClientName({ name: "  " }), null);
  });
});

describe("redirectUriIsLoopback", () => {
  it("warns on localhost and 127.0.0.1 redirect URIs", () => {
    assert.equal(redirectUriIsLoopback("http://localhost:3000/callback"), true);
    assert.equal(redirectUriIsLoopback("http://127.0.0.1:8787/"), true);
    assert.equal(redirectUriIsLoopback("https://claude.ai/callback"), false);
  });
});
