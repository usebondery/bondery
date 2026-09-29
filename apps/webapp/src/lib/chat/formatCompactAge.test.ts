import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCompactAge } from "./formatCompactAge.js";

const now = new Date("2026-09-29T12:00:00.000Z");
const labels = {
  ageDaysShort: (count: number) => `${count}d`,
  ageHoursShort: (count: number) => `${count}h`,
  lessThanMinuteLabel: "<1m",
};

function ago(ms: number): Date {
  return new Date(now.getTime() - ms);
}

describe("formatCompactAge", () => {
  it("uses lessThanMinuteLabel under 60 seconds", () => {
    assert.equal(formatCompactAge(ago(0), labels, now), "<1m");
    assert.equal(formatCompactAge(ago(59_999), labels, now), "<1m");
  });

  it("uses hours under 24 hours", () => {
    assert.equal(formatCompactAge(ago(3 * 60 * 60 * 1000), labels, now), "3h");
    assert.equal(formatCompactAge(ago(23 * 60 * 60 * 1000), labels, now), "23h");
  });

  it("shows 1h for sub-hour ages of at least a minute", () => {
    assert.equal(formatCompactAge(ago(90_000), labels, now), "1h");
    assert.equal(formatCompactAge(ago(59 * 60 * 1000), labels, now), "1h");
  });

  it("uses days from 24 hours onward", () => {
    assert.equal(formatCompactAge(ago(24 * 60 * 60 * 1000), labels, now), "1d");
    assert.equal(formatCompactAge(ago(18 * 24 * 60 * 60 * 1000), labels, now), "18d");
  });
});
