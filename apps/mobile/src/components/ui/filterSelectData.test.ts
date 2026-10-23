import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterSelectData } from "./filterSelectData.ts";

const DATA = [
  { label: "Prague", searchKeywords: "Europe/Prague CET", value: "Europe/Prague" },
  { label: "Tokyo", searchKeywords: "Asia/Tokyo JST", value: "Asia/Tokyo" },
  { label: "New York", value: "America/New_York" },
];

describe("filterSelectData", () => {
  it("returns all rows when the query is empty or whitespace", () => {
    assert.deepEqual(filterSelectData(DATA, ""), DATA);
    assert.deepEqual(filterSelectData(DATA, "   "), DATA);
  });

  it("matches label, value, and search keywords without case", () => {
    assert.deepEqual(filterSelectData(DATA, "prague"), [DATA[0]]);
    assert.deepEqual(filterSelectData(DATA, "america/new_york"), [DATA[2]]);
    assert.deepEqual(filterSelectData(DATA, "jst"), [DATA[1]]);
  });

  it("matches searchText", () => {
    const withSearchText = [{ label: "Hidden", searchText: "visible alias", value: "x" }];
    assert.deepEqual(filterSelectData(withSearchText, "alias"), withSearchText);
  });

  it("returns an empty list when nothing matches", () => {
    assert.deepEqual(filterSelectData(DATA, "nairobi"), []);
  });
});
