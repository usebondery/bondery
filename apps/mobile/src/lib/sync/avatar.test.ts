import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCacheBustToken } from "./avatar-clock.ts";

describe("toCacheBustToken", () => {
  it("returns a millisecond timestamp for a valid ISO date", () => {
    const clock = "2026-03-01T00:00:00.000Z";
    assert.equal(toCacheBustToken(clock), Date.parse(clock));
  });

  it("returns null when Date.parse is NaN", () => {
    assert.equal(toCacheBustToken("not-a-date"), null);
  });

  it("returns null for null and undefined", () => {
    assert.equal(toCacheBustToken(null), null);
    assert.equal(toCacheBustToken(undefined), null);
  });
});
