import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extensionEmptyFieldPatch } from "./extension-upsert.js";

describe("extensionEmptyFieldPatch", () => {
  it("fills only empty headline, location, and notes", () => {
    assert.deepEqual(
      extensionEmptyFieldPatch(
        { headline: null, location: null, notes: null },
        { headline: "Engineer", location: "Prague", notes: "Met at dinner" },
      ),
      { headline: "Engineer", location: "Prague", notes: "Met at dinner" },
    );
  });

  it("does not overwrite fields that already have values", () => {
    assert.deepEqual(
      extensionEmptyFieldPatch(
        { headline: "Existing", location: "London", notes: "Keep" },
        { headline: "New", location: "Paris", notes: "Ignore" },
      ),
      {},
    );
  });
});
