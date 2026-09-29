import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contactCreateHasExtras } from "./create-contact.js";

describe("contactCreateHasExtras", () => {
  it("is false for name-only create", () => {
    assert.equal(
      contactCreateHasExtras({ firstName: "Ada", lastName: "Lovelace", middleName: "A" }),
      false,
    );
  });

  it("is true when phones or notes are included in the same call", () => {
    assert.equal(contactCreateHasExtras({ firstName: "Ada", notes: "Met at dinner" }), true);
    assert.equal(
      contactCreateHasExtras({
        firstName: "Ada",
        phones: [{ preferred: true, prefix: "+44", type: "home", value: "2079460958" }],
      }),
      true,
    );
  });
});
