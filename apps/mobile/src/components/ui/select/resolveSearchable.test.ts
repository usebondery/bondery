import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSelectSearchable, SELECT_SEARCH_AUTO_THRESHOLD } from "./resolveSearchable.ts";

describe("resolveSelectSearchable", () => {
  it("returns false when searchable is omitted", () => {
    assert.equal(resolveSelectSearchable(undefined, 100), false);
  });

  it("returns the boolean when searchable is true or false", () => {
    assert.equal(resolveSelectSearchable(true, 0), true);
    assert.equal(resolveSelectSearchable(false, 100), false);
  });

  it("enables search at the auto threshold", () => {
    assert.equal(resolveSelectSearchable("auto", SELECT_SEARCH_AUTO_THRESHOLD - 1), false);
    assert.equal(resolveSelectSearchable("auto", SELECT_SEARCH_AUTO_THRESHOLD), true);
  });
});
