import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideChatTurn } from "./turn.js";

const COMPLETE = { status: "complete", text: "All done" };
const INCOMPLETE = { status: "incomplete", text: "Half a reply" };
const WRITE = {
  activities: [{ kind: "write", tool: "create_contact" }],
  status: "complete",
  text: "Created Jordan",
};

describe("decideChatTurn", () => {
  it("charges quota and inserts the user row for a new message", () => {
    const result = decideChatTurn("message", {
      lastUserText: "",
      requestUserText: "hello",
    });

    assert.deepEqual(result, {
      decision: { chargeQuota: true, insertUserMessage: true, reuseAssistantRow: false },
    });
  });

  it("retries an unfinished turn without inserting a user row", () => {
    const result = decideChatTurn("retry", {
      lastAssistantContent: INCOMPLETE,
      lastUserText: "who is Jordan",
      requestUserText: "who is Jordan",
    });

    assert.deepEqual(result, {
      decision: { chargeQuota: true, insertUserMessage: false, reuseAssistantRow: true },
    });
  });

  it("resumes an approval without charging quota", () => {
    const result = decideChatTurn("approval", {
      lastAssistantContent: INCOMPLETE,
      lastUserText: "delete Jordan",
      requestUserText: "delete Jordan",
    });

    assert.deepEqual(result, {
      decision: { chargeQuota: false, insertUserMessage: false, reuseAssistantRow: true },
    });
  });

  it("refuses a retry after a write landed", () => {
    const result = decideChatTurn("retry", {
      lastAssistantContent: WRITE,
      lastUserText: "delete Jordan",
      requestUserText: "delete Jordan",
    });

    assert.deepEqual(result, { reason: "already_changed" });
  });

  it("refuses a retry when a write may have landed", () => {
    const result = decideChatTurn("retry", {
      lastAssistantContent: { status: "incomplete", text: "", writeMayHaveLanded: true },
      lastUserText: "delete Jordan",
      requestUserText: "delete Jordan",
    });

    assert.deepEqual(result, { reason: "already_changed" });
  });

  it("refuses a retry when the reply already finished", () => {
    const result = decideChatTurn("retry", {
      lastAssistantContent: COMPLETE,
      lastUserText: "who is Jordan",
      requestUserText: "who is Jordan",
    });

    assert.deepEqual(result, { reason: "already_finished" });
  });

  it("refuses a retry when the text does not match the stored turn", () => {
    const result = decideChatTurn("retry", {
      lastAssistantContent: INCOMPLETE,
      lastUserText: "who is Jordan",
      requestUserText: "who is Alex",
    });

    assert.deepEqual(result, { reason: "text_mismatch" });
  });

  it("allows an approval whose tool wrote nothing yet", () => {
    const result = decideChatTurn("approval", {
      lastAssistantContent: INCOMPLETE,
      lastUserText: "delete Jordan",
      requestUserText: "delete Jordan",
    });

    assert.equal("decision" in result, true);
  });
});
