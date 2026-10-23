import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  affectedTablesTouchContacts,
  affectedTablesTouchGroups,
  affectedTablesTouchTags,
} from "./affected-tables.js";

describe("affected sync tables", () => {
  it("maps contact child tables to contacts", () => {
    assert.equal(affectedTablesTouchContacts(["people_phones"]), true);
    assert.equal(affectedTablesTouchContacts(["groups"]), false);
  });

  it("maps membership tables to groups", () => {
    assert.equal(affectedTablesTouchGroups(["people_groups"]), true);
    assert.equal(affectedTablesTouchGroups(["tags"]), false);
  });

  it("maps contact tag tables to tags", () => {
    assert.equal(affectedTablesTouchTags(["people_tags"]), true);
    assert.equal(affectedTablesTouchTags(["people"]), false);
  });
});
