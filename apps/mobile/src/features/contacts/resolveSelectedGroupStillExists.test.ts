import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveSelectedGroupStillExists } from "./resolveSelectedGroupStillExists.ts";

describe("resolveSelectedGroupStillExists", () => {
  const groups = [
    { color: null, contactCount: 1, emoji: "💼", id: "a", label: "Work" },
    { color: null, contactCount: 2, emoji: null, id: "b", label: "Family" },
  ];

  it("returns true when no group is selected", () => {
    assert.equal(resolveSelectedGroupStillExists(groups, null), true);
  });

  it("returns true when selected id is in groups", () => {
    assert.equal(resolveSelectedGroupStillExists(groups, "a"), true);
  });

  it("returns false when selected id is missing", () => {
    assert.equal(resolveSelectedGroupStillExists(groups, "missing"), false);
  });
});
