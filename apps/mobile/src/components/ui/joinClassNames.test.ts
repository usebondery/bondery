import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { joinClassNames } from "./joinClassNames.ts";

describe("joinClassNames", () => {
  it("joins non-empty strings with a space", () => {
    assert.equal(joinClassNames("flex", "gap-2"), "flex gap-2");
  });

  it("skips false, null, undefined, and empty strings", () => {
    assert.equal(joinClassNames("flex", false, null, undefined, "", "gap-2"), "flex gap-2");
  });

  it("returns an empty string when every part is skipped", () => {
    assert.equal(joinClassNames(false, null, undefined, ""), "");
  });
});
