import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatContactName } from "./format-contact-name.js";

describe("formatContactName", () => {
  it("joins first, middle, and last name", () => {
    assert.equal(
      formatContactName({ firstName: "Ada", lastName: "Lovelace", middleName: "M" }),
      "Ada M Lovelace",
    );
  });

  it("omits blank middle name", () => {
    assert.equal(formatContactName({ firstName: "Ada", lastName: "Lovelace" }), "Ada Lovelace");
  });

  it("trims whitespace from parts", () => {
    assert.equal(
      formatContactName({ firstName: " Ada ", lastName: " Lovelace ", middleName: " M " }),
      "Ada M Lovelace",
    );
  });

  it("returns empty string when all parts are blank", () => {
    assert.equal(formatContactName({ firstName: "", lastName: "" }), "");
  });
});
