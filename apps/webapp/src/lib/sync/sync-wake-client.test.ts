import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affectedTablesTouchContacts,
  affectedTablesTouchGroups,
  affectedTablesTouchTags,
} from "./sync-wake-tables.js";

describe("sync wake table mapping", () => {
  it("detects contact domain tables", () => {
    assert.equal(affectedTablesTouchContacts(["people_phones"]), true);
    assert.equal(affectedTablesTouchContacts(["groups"]), false);
  });

  it("detects group domain tables", () => {
    assert.equal(affectedTablesTouchGroups(["people_groups"]), true);
    assert.equal(affectedTablesTouchGroups(["tags"]), false);
  });

  it("detects tag domain tables", () => {
    assert.equal(affectedTablesTouchTags(["people_tags"]), true);
    assert.equal(affectedTablesTouchTags(["people"]), false);
  });
});
