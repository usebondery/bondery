import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContactSharePreview } from "./share.js";

describe("buildContactSharePreview", () => {
  it("uses the shared field helper and falls back when the name is empty", () => {
    const named = buildContactSharePreview("person-1", {
      emails: [{ type: "work", value: "ada@example.com" }],
      firstName: "Ada",
      lastName: "Lovelace",
    });
    assert.equal(named.contactId, "person-1");
    assert.equal(named.contactName, "Ada Lovelace");
    assert.deepEqual(
      named.availableFields.map((entry) => entry.field),
      ["name", "emails"],
    );

    const unnamed = buildContactSharePreview("person-2", { notes: null });
    assert.equal(unnamed.contactName, "Unnamed contact");
    assert.deepEqual(unnamed.availableFields, []);
  });
});
