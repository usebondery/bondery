import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMcpWriteToolName } from "./mcp-write-name.js";

describe("isMcpWriteToolName", () => {
  it("treats create/update/delete tools as writes", () => {
    assert.equal(isMcpWriteToolName("create_contact"), true);
    assert.equal(isMcpWriteToolName("update_keep_in_touch"), true);
    assert.equal(isMcpWriteToolName("update_important_dates"), true);
    assert.equal(isMcpWriteToolName("delete_group_membership"), true);
  });

  it("treats get/search tools as reads", () => {
    assert.equal(isMcpWriteToolName("get_contact"), false);
    assert.equal(isMcpWriteToolName("search_contacts"), false);
    assert.equal(isMcpWriteToolName("get_keep_in_touch_count"), false);
    assert.equal(isMcpWriteToolName("get_contact_linkedin"), false);
  });
});
