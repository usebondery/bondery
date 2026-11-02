import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UIMessage } from "ai";
import {
  hasPendingToolApproval,
  hasToolApprovalDecision,
  stripToolPartsForModel,
} from "./message-parts.js";

function textMessage(id: string, role: "user" | "assistant", text: string): UIMessage {
  return { id, parts: [{ text, type: "text" }], role };
}

function toolMessage(
  id: string,
  state: string,
  approval?: { id: string; approved?: boolean },
): UIMessage {
  return {
    id,
    parts: [
      {
        ...(approval ? { approval } : {}),
        input: { personId: "some-id" },
        state,
        toolCallId: "call-1",
        type: "tool-delete_contact",
      } as unknown as UIMessage["parts"][number],
    ],
    role: "assistant",
  };
}

describe("stripToolPartsForModel", () => {
  it("removes live tool parts on a new message", () => {
    const stripped = stripToolPartsForModel([
      textMessage("u1", "user", "delete Jordan"),
      toolMessage("a1", "output-available"),
    ]);

    assert.equal(stripped[1]?.parts.length, 0);
    assert.equal(stripped[0]?.parts.length, 1);
  });

  it("keeps tool parts only on the latest assistant message for an approval", () => {
    const approval = { approved: true, id: "approval-1" };
    const stripped = stripToolPartsForModel(
      [
        textMessage("u1", "user", "delete Jordan"),
        toolMessage("a1", "output-available"),
        textMessage("u2", "user", "and the other one"),
        toolMessage("a2", "approval-responded", approval),
      ],
      { keepApproval: true },
    );

    assert.equal(stripped[1]?.parts.length, 0);
    assert.equal(stripped[3]?.parts.length, 1);
  });

  it("strips everything when keepApproval has no approval part", () => {
    const stripped = stripToolPartsForModel([toolMessage("a1", "output-available")], {
      keepApproval: true,
    });

    assert.equal(stripped[0]?.parts.length, 0);
  });

  it("keeps the approval message even when a later message exists", () => {
    const approval = { approved: true, id: "approval-1" };
    const stripped = stripToolPartsForModel(
      [
        textMessage("u1", "user", "delete Jordan"),
        toolMessage("a1", "approval-responded", approval),
      ],
      { keepApproval: true },
    );

    assert.equal(stripped[1]?.parts.length, 1);
  });
});

describe("hasPendingToolApproval", () => {
  it("detects a paused tool on the last assistant message", () => {
    assert.equal(
      hasPendingToolApproval([toolMessage("a1", "approval-requested", { id: "approval-1" })]),
      true,
    );
  });

  it("is false once the tool ran", () => {
    assert.equal(hasPendingToolApproval([toolMessage("a1", "output-available")]), false);
  });
});

describe("hasToolApprovalDecision", () => {
  it("detects a recorded decision, approved or denied", () => {
    assert.equal(
      hasToolApprovalDecision([
        toolMessage("a1", "approval-responded", { approved: true, id: "a" }),
      ]),
      true,
    );
    assert.equal(
      hasToolApprovalDecision([
        toolMessage("a1", "approval-responded", { approved: false, id: "a" }),
      ]),
      true,
    );
  });

  it("is false while the decision is still pending", () => {
    assert.equal(
      hasToolApprovalDecision([toolMessage("a1", "approval-requested", { id: "a" })]),
      false,
    );
  });
});
