import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCopyableInputType } from "#CopyableInput/inputType.js";

describe("resolveCopyableInputType", () => {
  it("masks a secret until it is revealed", () => {
    assert.equal(resolveCopyableInputType(true, false), "password");
    assert.equal(resolveCopyableInputType(true, true), "text");
  });

  it("never masks a plain value", () => {
    assert.equal(resolveCopyableInputType(false, false), "text");
    assert.equal(resolveCopyableInputType(false, true), "text");
  });
});
