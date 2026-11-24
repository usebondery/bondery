import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MCP_SERVER_INSTRUCTIONS } from "./instructions.js";

const SEARCH_CONTACTS_PATTERN = /search_contacts/;
const GET_CONTACT_PATTERN = /get_contact/;
const GET_CONTACT_LINKEDIN_PATTERN = /get_contact_linkedin/;
const UPDATE_CONTACT_PATTERN = /update_contact/;
const UPDATE_IMPORTANT_DATES_PATTERN = /update_important_dates/;
const PARTICIPANTIDS_PATTERN = /participantIds/;
const FULL_ACCESS_PATTERN = /Full access/;
const OWN_CONTACT_CARD_PATTERN = /own contact card/;
const DOC_URL_PATTERN = /doc_url/;
const CREATE_AGENT_FEEDBACK_PATTERN = /create_agent_feedback/;
const REQUEST_ID_PATTERN = /request_id/;
const DO_NOT_SEND_CONTACT_DATA_PATTERN = /do not send contact data/i;

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
