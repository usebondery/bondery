import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MCP_SERVER_INSTRUCTIONS } from "./instructions.js";

const SEARCH_CONTACTS_PATTERN = /search_contacts/u;
const GET_CONTACT_PATTERN = /get_contact/u;
const GET_CONTACT_LINKEDIN_PATTERN = /get_contact_linkedin/u;
const UPDATE_CONTACT_PATTERN = /update_contact/u;
const UPDATE_IMPORTANT_DATES_PATTERN = /update_important_dates/u;
const PARTICIPANTIDS_PATTERN = /participantIds/u;
const FULL_ACCESS_PATTERN = /Full access/u;
const OWN_CONTACT_CARD_PATTERN = /own contact card/u;
const DOC_URL_PATTERN = /doc_url/u;
const CREATE_AGENT_FEEDBACK_PATTERN = /create_agent_feedback/u;
const REQUEST_ID_PATTERN = /request_id/u;
const DO_NOT_SEND_CONTACT_DATA_PATTERN = /do not send contact data/iu;

describe("mCP_SERVER_INSTRUCTIONS", () => {
  it("names the search-then-get path and the write-access split", () => {
    assert.match(MCP_SERVER_INSTRUCTIONS, SEARCH_CONTACTS_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, GET_CONTACT_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, GET_CONTACT_LINKEDIN_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, UPDATE_CONTACT_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, UPDATE_IMPORTANT_DATES_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, PARTICIPANTIDS_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, FULL_ACCESS_PATTERN);
    assert.doesNotMatch(MCP_SERVER_INSTRUCTIONS, OWN_CONTACT_CARD_PATTERN);
  });

  it("teaches recovery from an error and the feedback tool", () => {
    assert.match(MCP_SERVER_INSTRUCTIONS, DOC_URL_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, CREATE_AGENT_FEEDBACK_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, REQUEST_ID_PATTERN);
    assert.match(MCP_SERVER_INSTRUCTIONS, DO_NOT_SEND_CONTACT_DATA_PATTERN);
  });
});
