import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mcpToolMeta } from "./mcp-tool-meta.js";

describe("mcpToolMeta", () => {
  it("marks create and update destructive, and get and search read-only", () => {
    assert.equal(mcpToolMeta("create", "Create").annotations.destructiveHint, true);
    assert.equal(mcpToolMeta("create", "Create").annotations.readOnlyHint, false);
    assert.equal(mcpToolMeta("update", "Update").annotations.destructiveHint, true);
    assert.equal(mcpToolMeta("update", "Update").annotations.readOnlyHint, false);
    assert.equal(mcpToolMeta("get", "Get").annotations.readOnlyHint, true);
    assert.equal(mcpToolMeta("get", "Get").annotations.destructiveHint, false);
    assert.equal(mcpToolMeta("search", "Search").annotations.readOnlyHint, true);
    assert.equal(mcpToolMeta("search", "Search").annotations.destructiveHint, false);
    assert.equal(mcpToolMeta("delete", "Delete").annotations.destructiveHint, true);
    assert.equal(mcpToolMeta("delete", "Delete").annotations.readOnlyHint, false);
  });
});
