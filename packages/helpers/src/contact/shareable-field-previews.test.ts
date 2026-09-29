import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildShareableFieldPreviews } from "./shareable-field-previews.js";

describe("buildShareableFieldPreviews", () => {
  it("omits empty fields and includes populated ones", () => {
    const previews = buildShareableFieldPreviews({
      emails: [{ type: "work", value: "ada@example.com" }],
      firstName: "Ada",
      lastName: "Lovelace",
      notes: null,
    });
    assert.deepEqual(
      previews.map((entry) => entry.field),
      ["name", "emails"],
    );
    assert.equal(previews[0]?.preview, "Ada Lovelace");
    assert.equal(previews[1]?.preview, "ada@example.com (work)");
  });

  it("summarizes important dates by count", () => {
    const previews = buildShareableFieldPreviews({
      firstName: "Ada",
      importantDates: [
        { date: "1815-12-10", type: "birthday" },
        { date: "1852-11-27", type: "other" },
      ],
    });
    const dates = previews.find((entry) => entry.field === "importantDates");
    assert.equal(dates?.preview, "2 date(s)");
  });
});
