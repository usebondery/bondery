import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MCP_SERVER_INSTRUCTIONS } from "./instructions.js";

describe("MCP_SERVER_INSTRUCTIONS", () => {
  it("names the search-then-get path and the write-access split", () => {
    assert.match(MCP_SERVER_INSTRUCTIONS, /search_contacts/);
    assert.match(MCP_SERVER_INSTRUCTIONS, /get_contact/);
    assert.match(MCP_SERVER_INSTRUCTIONS, /get_contact_linkedin/);
    assert.match(MCP_SERVER_INSTRUCTIONS, /update_contact/);
    assert.match(MCP_SERVER_INSTRUCTIONS, /update_important_dates/);
    assert.match(MCP_SERVER_INSTRUCTIONS, /participantIds/);
    assert.match(MCP_SERVER_INSTRUCTIONS, /Full access/);
    assert.doesNotMatch(MCP_SERVER_INSTRUCTIONS, /own contact card/);
  });
});
