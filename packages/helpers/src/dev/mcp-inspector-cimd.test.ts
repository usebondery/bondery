import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL } from "./mcp-inspector-cimd.js";

describe("MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL", () => {
  it("points at the public MCPJam Inspector CIMD", () => {
    assert.equal(
      MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL,
      "https://www.mcpjam.com/.well-known/oauth/client-metadata.json",
    );
  });
});
