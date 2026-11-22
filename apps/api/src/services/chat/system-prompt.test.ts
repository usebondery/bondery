import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChatSystemPrompt } from "./system-prompt.js";

const YOUR_CONTACT_CARD_ID_IS_PATTERN =
  /Your contact card id is 11111111-1111-4111-8111-111111111111/;
const GET_CONTACT_LINKEDIN_PATTERN = /get_contact_linkedin/;
const UPDATE_INTERACTION_PATTERN = /update_interaction/;
const CREATE_INTERACTION_PATTERN = /create_interaction/;
const BP_ACTION_SHARE_CONTACT_UUID_PATTERN = /\[\[bp:action:share-contact\|UUID\]\]/;
const ERROR_CODE_MESSAGE_DOC_URL_PATTERN = /error: \{ code, message, doc_url \}/;
const LOG_INTERACTION_PATTERN = /log_interaction/;
const GET_MYSELF_DETAILS_PATTERN = /get_myself_details/;

describe("buildChatSystemPrompt", () => {
  it("injects the myself contact id and canonical tool names", () => {
    const prompt = buildChatSystemPrompt({
      myselfPersonId: "11111111-1111-4111-8111-111111111111",
      today: "2026-09-29",
    });
    assert.match(prompt, YOUR_CONTACT_CARD_ID_IS_PATTERN);
    assert.match(prompt, GET_CONTACT_LINKEDIN_PATTERN);
    assert.match(prompt, UPDATE_INTERACTION_PATTERN);
    assert.match(prompt, CREATE_INTERACTION_PATTERN);
    assert.match(prompt, BP_ACTION_SHARE_CONTACT_UUID_PATTERN);
    assert.match(prompt, ERROR_CODE_MESSAGE_DOC_URL_PATTERN);
    assert.doesNotMatch(prompt, LOG_INTERACTION_PATTERN);
    assert.doesNotMatch(prompt, GET_MYSELF_DETAILS_PATTERN);
  });
});
