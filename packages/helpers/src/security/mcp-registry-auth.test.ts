import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BONDERY_MCP_REGISTRY_AUTH_PROOF } from "./mcp-registry-auth.js";

describe("BONDERY_MCP_REGISTRY_AUTH_PROOF", () => {
  it("matches the MCP Registry HTTP/DNS proof record format", () => {
    assert.match(BONDERY_MCP_REGISTRY_AUTH_PROOF, /^v=MCPv1; k=ed25519; p=[A-Za-z0-9+/=]+$/);
  });
});
