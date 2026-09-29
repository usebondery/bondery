import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChatSystemPrompt } from "./system-prompt.js";

describe("buildChatSystemPrompt", () => {
  it("injects the myself contact id and canonical tool names", () => {
    const prompt = buildChatSystemPrompt({
      myselfPersonId: "11111111-1111-4111-8111-111111111111",
      today: "2026-09-29",
    });
    assert.match(prompt, /Your contact card id is 11111111-1111-4111-8111-111111111111/);
    assert.match(prompt, /get_contact_linkedin/);
    assert.match(prompt, /update_interaction/);
    assert.match(prompt, /create_interaction/);
    assert.match(prompt, /\[\[bp:action:share-contact\|UUID\]\]/);
    assert.match(prompt, /error: \{ code, message, doc_url \}/);
    assert.doesNotMatch(prompt, /log_interaction/);
    assert.doesNotMatch(prompt, /get_myself_details/);
  });
});
