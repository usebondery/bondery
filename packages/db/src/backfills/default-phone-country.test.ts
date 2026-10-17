import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveBackfillPhoneCountryForTimezone } from "./default-phone-country.js";

describe("resolveBackfillPhoneCountryForTimezone", () => {
  it("returns null for UTC and blank timezone", () => {
    assert.equal(resolveBackfillPhoneCountryForTimezone("UTC"), null);
    assert.equal(resolveBackfillPhoneCountryForTimezone(""), null);
    assert.equal(resolveBackfillPhoneCountryForTimezone(null), null);
  });

  it("maps Europe/Prague to CZ", () => {
    assert.equal(resolveBackfillPhoneCountryForTimezone("Europe/Prague"), "CZ");
  });

  it("maps America/New_York to US", () => {
    assert.equal(resolveBackfillPhoneCountryForTimezone("America/New_York"), "US");
  });
});
