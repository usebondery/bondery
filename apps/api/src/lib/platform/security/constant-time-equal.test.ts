import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { constantTimeEqual } from "./constant-time-equal.js";

describe("constantTimeEqual", () => {
  it("returns true for equal strings", () => {
    assert.equal(constantTimeEqual("s3cret-value", "s3cret-value"), true);
    assert.equal(constantTimeEqual("", ""), true);
  });

  it("returns false for different strings of the same length", () => {
    assert.equal(constantTimeEqual("s3cret-valuf", "s3cret-value"), false);
  });

  it("returns false for different lengths without throwing", () => {
    assert.equal(constantTimeEqual("s3cret", "s3cret-value"), false);
    assert.equal(constantTimeEqual("s3cret-value-and-more", "s3cret-value"), false);
    assert.equal(constantTimeEqual("", "s3cret-value"), false);
  });

  it("compares multi-byte characters by their UTF-8 bytes", () => {
    assert.equal(constantTimeEqual("héllo", "héllo"), true);
    assert.equal(constantTimeEqual("héllo", "hello"), false);
  });
});
