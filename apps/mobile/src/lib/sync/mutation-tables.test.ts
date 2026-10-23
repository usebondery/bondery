import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSyncMutationTables } from "./mutation-tables.ts";

describe("getSyncMutationTables", () => {
  it("includes every table written by contact updates", () => {
    assert.deepEqual(getSyncMutationTables("contact.update"), [
      "people",
      "people_addresses",
      "people_emails",
      "people_phones",
      "people_socials",
    ]);
  });

  it("includes relation cleanup tables for deletes", () => {
    assert.deepEqual(getSyncMutationTables("group.delete"), ["groups", "people_groups"]);
    assert.deepEqual(getSyncMutationTables("tag.delete"), ["tags", "people_tags"]);
  });

  it("maps membership mutations to the join table", () => {
    assert.deepEqual(getSyncMutationTables("group.addMembers"), ["people_groups"]);
  });
});
