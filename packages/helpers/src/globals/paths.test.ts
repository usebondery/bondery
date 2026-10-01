import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  API_ROUTES,
  betterAuthAuthorizationServerMetadataPath,
  betterAuthAuthorizationServerMetadataPaths,
  betterAuthOpenIdConfigurationPath,
  betterAuthOpenIdConfigurationPaths,
  betterAuthProtectedResourceMetadataPaths,
  publicOAuthDiscoveryPaths,
  WEBSITE_ROUTES,
} from "./paths.js";

describe("OAuth discovery paths", () => {
  it("lists canonical RFC 8414, OIDC, and RFC 9728 documents plus aliases", () => {
    assert.equal(
      betterAuthAuthorizationServerMetadataPath(),
      "/.well-known/oauth-authorization-server/auth",
    );
    assert.deepEqual(betterAuthAuthorizationServerMetadataPaths(), [
      "/.well-known/oauth-authorization-server/auth",
      "/.well-known/oauth-authorization-server",
    ]);
    assert.equal(betterAuthOpenIdConfigurationPath(), "/auth/.well-known/openid-configuration");
    assert.deepEqual(betterAuthOpenIdConfigurationPaths(), [
      "/auth/.well-known/openid-configuration",
      "/.well-known/openid-configuration",
      "/.well-known/openid-configuration/auth",
    ]);
    assert.deepEqual(betterAuthProtectedResourceMetadataPaths(), [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
      "/mcp/.well-known/oauth-protected-resource",
    ]);
  });

  it("exposes every public discovery path for the unauthenticated allowlist", () => {
    const paths = publicOAuthDiscoveryPaths();
    assert.equal(new Set(paths).size, paths.length);
    assert.ok(paths.includes("/.well-known/oauth-authorization-server"));
    assert.ok(paths.includes("/.well-known/openid-configuration"));
    assert.ok(paths.includes("/mcp/.well-known/oauth-protected-resource"));
    assert.equal(paths.includes(API_ROUTES.WELL_KNOWN_MCP), false);
    assert.equal(paths.includes(WEBSITE_ROUTES.WELL_KNOWN_MCP), false);
  });
});

describe("agent discovery pointer paths", () => {
  it("keeps llms.txt and MCP well-known pointers as path constants", () => {
    assert.equal(WEBSITE_ROUTES.LLMS_TXT, "/llms.txt");
    assert.equal(WEBSITE_ROUTES.WELL_KNOWN_LLMS_TXT, "/.well-known/llms.txt");
    assert.equal(WEBSITE_ROUTES.WELL_KNOWN_MCP, "/.well-known/mcp");
    assert.equal(WEBSITE_ROUTES.WELL_KNOWN_MCP_REGISTRY_AUTH, "/.well-known/mcp-registry-auth");
    assert.equal(API_ROUTES.MCP, "/mcp");
    assert.equal(API_ROUTES.WELL_KNOWN_MCP, "/.well-known/mcp");
    assert.equal(WEBSITE_ROUTES.API_REFERENCE, "/api-reference");
    assert.equal(WEBSITE_ROUTES.DOCS_API_REFERENCE, "/docs/api/api-reference");
    assert.equal(API_ROUTES.API_REFERENCE, "/api-reference");
    assert.equal(API_ROUTES.DOCS_API, "/docs/api");
  });
});
