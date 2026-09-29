import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mcpAccessFromScopes } from "./mcp-access.js";

describe("mcpAccessFromScopes", () => {
  it("maps mcp:write to full access", () => {
    assert.equal(mcpAccessFromScopes(["openid", "mcp:read", "mcp:write"]), "full");
  });

  it("maps read-only consents to read", () => {
    assert.equal(mcpAccessFromScopes(["openid", "mcp:read"]), "read");
    assert.equal(mcpAccessFromScopes([]), "read");
  });
});
