import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseInteractionsListParams, timelineFilterFromParsed } from "./interactionsListParams.js";

describe("parseInteractionsListParams", () => {
  it("trims search", () => {
    const parsed = parseInteractionsListParams({ search: "  ada  " });
    assert.equal(parsed.search, "ada");
    assert.equal(parsed.invalidRange, false);
  });

  it("drops a bad date", () => {
    const parsed = parseInteractionsListParams({
      end_date: "2026-02-31",
      search: "ada",
      start_date: "yesterday",
    });
    assert.equal(parsed.search, "ada");
    assert.equal(parsed.start_date, undefined);
    assert.equal(parsed.end_date, undefined);
    assert.equal(parsed.invalidRange, false);
  });

  it("flags start_date after end_date and omits both dates from the query filter", () => {
    const parsed = parseInteractionsListParams({
      end_date: "2026-06-01",
      start_date: "2026-06-02",
    });
    assert.equal(parsed.invalidRange, true);
    assert.equal(parsed.start_date, "2026-06-02");
    assert.equal(parsed.end_date, "2026-06-01");
    assert.deepEqual(timelineFilterFromParsed(parsed), {});
  });
});
