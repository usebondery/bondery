import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildToolActivity, isHardDeleteTool, resolveToolKind } from "./activity.js";
import {
  CHAT_MODEL_IDS,
  DEFAULT_CHAT_MODEL_ID,
  FAST_CHAT_MODEL_ID,
  isChatModelId,
  resolveAnthropicModelId,
} from "./models.js";

describe("chat models", () => {
  it("maps every public id to an Anthropic id", () => {
    assert.equal(resolveAnthropicModelId("anthropic/claude-haiku-5.5"), "claude-haiku-5-5");
    assert.equal(resolveAnthropicModelId("anthropic/claude-sonnet-5.5"), "claude-sonnet-5-5");
  });

  it("defaults to Auto when the id is omitted", () => {
    assert.equal(DEFAULT_CHAT_MODEL_ID, "auto");
    assert.equal(resolveAnthropicModelId(), "claude-haiku-5-5");
  });

  it("keeps Auto on the fast model until routing exists", () => {
    assert.equal(resolveAnthropicModelId("auto"), resolveAnthropicModelId(FAST_CHAT_MODEL_ID));
  });

  it("rejects an id outside the allowlist", () => {
    assert.equal(isChatModelId("anthropic/claude-opus-5.5"), false);
    assert.equal(isChatModelId("claude-sonnet-5-5"), false);
    assert.equal(isChatModelId(undefined), false);

    for (const id of CHAT_MODEL_IDS) {
      assert.equal(isChatModelId(id), true);
    }
  });
});

describe("chat tool activity", () => {
  it("treats get and search as reads and everything else as writes", () => {
    assert.equal(resolveToolKind("get_contact"), "read");
    assert.equal(resolveToolKind("search_contacts"), "read");
    assert.equal(resolveToolKind("create_contact"), "write");
    assert.equal(resolveToolKind("delete_tag_membership"), "write");
  });

  it("gates only record deletes for a confirm", () => {
    assert.equal(isHardDeleteTool("delete_contact"), true);
    assert.equal(isHardDeleteTool("delete_tags"), true);
    assert.equal(isHardDeleteTool("delete_tag_membership"), false);
    assert.equal(isHardDeleteTool("update_contact"), false);
  });

  it("keeps a short label and drops private fields", () => {
    const activity = buildToolActivity("create_interaction", {
      email: "someone@example.com",
      name: "Jordan",
      notes: "private",
      title: "Coffee",
    });

    assert.deepEqual(activity, {
      displayName: "Jordan",
      kind: "write",
      tool: "create_interaction",
    });
  });

  it("trims long labels and falls back when no name field exists", () => {
    const longName = "a".repeat(200);
    assert.equal(buildToolActivity("get_contact", { name: longName }).displayName?.length, 80);
    assert.equal(buildToolActivity("get_contact", { personId: "abc" }).displayName, undefined);
  });
});
