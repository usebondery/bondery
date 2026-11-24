import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firstAiUsagePeriodEnd } from "./ai-usage-period.js";

describe("firstAiUsagePeriodEnd", () => {
  it("keeps the day of the month one month later", () => {
    const now = new Date("2026-11-14T09:30:00.000Z");
    assert.equal(firstAiUsagePeriodEnd(now).toISOString(), "2026-12-14T09:30:00.000Z");
  });

  it("crosses a year boundary", () => {
    const now = new Date("2026-12-14T09:30:00.000Z");
    assert.equal(firstAiUsagePeriodEnd(now).toISOString(), "2027-01-14T09:30:00.000Z");
  });

  it("rolls a 31st forward instead of producing an impossible date", () => {
    // January 31 has no counterpart in February, so the period ends on the 2nd or 3rd.
    const now = new Date("2027-01-31T00:00:00.000Z");
    const end = firstAiUsagePeriodEnd(now);
    assert.ok(end.getTime() > now.getTime(), "the period must end in the future");
    assert.equal(end.getUTCMonth(), 2);
  });

  it("does not mutate the date it receives", () => {
    const now = new Date("2026-11-14T09:30:00.000Z");
    firstAiUsagePeriodEnd(now);
    assert.equal(now.toISOString(), "2026-11-14T09:30:00.000Z");
  });
});
