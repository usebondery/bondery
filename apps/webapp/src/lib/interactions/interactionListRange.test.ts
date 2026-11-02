import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localCalendarDayEnd, localCalendarDayStart } from "./interactionListRange.js";

describe("interaction list range", () => {
  it("turns a calendar day into local midnight through local end of that day", () => {
    const start = localCalendarDayStart("2026-06-15");
    const end = localCalendarDayEnd("2026-06-15");

    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 5);
    assert.equal(start.getDate(), 15);
    assert.equal(start.getHours(), 0);
    assert.equal(start.getMinutes(), 0);
    assert.equal(start.getSeconds(), 0);
    assert.equal(start.getMilliseconds(), 0);

    assert.equal(end.getFullYear(), 2026);
    assert.equal(end.getMonth(), 5);
    assert.equal(end.getDate(), 15);
    assert.equal(end.getHours(), 23);
    assert.equal(end.getMinutes(), 59);
    assert.equal(end.getSeconds(), 59);
    assert.equal(end.getMilliseconds(), 999);
    assert.ok(end.getTime() >= start.getTime());
  });
});
