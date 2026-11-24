import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipEmailPreview, EMAIL_PREVIEW_MAX_CHARS } from "./chrome.js";

const PATTERN_5E6120622B_RE = /^a b+/;

describe("clipEmailPreview", () => {
  it("keeps inbox preview at or under 90 characters", () => {
    assert.equal(EMAIL_PREVIEW_MAX_CHARS, 90);
    assert.equal(clipEmailPreview("Expires in 15 minutes"), "Expires in 15 minutes");
  });

  it("collapses whitespace and clips with an ellipsis", () => {
    const clipped = clipEmailPreview(`a${" ".repeat(4)}${"b".repeat(100)}`);
    assert.equal(clipped.length, EMAIL_PREVIEW_MAX_CHARS);
    assert.equal(clipped.endsWith("…"), true);
    assert.match(clipped, PATTERN_5E6120622B_RE);
  });
});
