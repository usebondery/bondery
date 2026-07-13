import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patchAffectsMergeRecommendations } from "./merge-recommendations.js";

describe("patchAffectsMergeRecommendations", () => {
  it("returns true for name and channel fields", () => {
    assert.equal(patchAffectsMergeRecommendations({ firstName: "Ada" }), true);
    assert.equal(patchAffectsMergeRecommendations({ phones: [] }), true);
    assert.equal(patchAffectsMergeRecommendations({ linkedin: "ada-lovelace" }), true);
  });

  it("returns false for unrelated fields", () => {
    assert.equal(patchAffectsMergeRecommendations({ headline: "Engineer" }), false);
    assert.equal(patchAffectsMergeRecommendations({ notes: "Hello" }), false);
  });
});
