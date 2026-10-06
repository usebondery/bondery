import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPostgresDate } from "./linkedin-helpers.js";

describe("toPostgresDate", () => {
  it("pads year-month to the first of the month", () => {
    assert.equal(toPostgresDate("2020-01"), "2020-01-01");
  });

  it("keeps a full date", () => {
    assert.equal(toPostgresDate("2020-01-15"), "2020-01-15");
  });

  it("stores year-only as the mid-year sentinel", () => {
    assert.equal(toPostgresDate("2020"), "2020-07-02");
  });

  it("returns null for empty input", () => {
    assert.equal(toPostgresDate(""), null);
    assert.equal(toPostgresDate(null), null);
    assert.equal(toPostgresDate(undefined), null);
  });
});
