import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesSearchQuery } from "./matches-search-query.js";

describe("matchesSearchQuery", () => {
  it("matches substring and country names", () => {
    assert.equal(matchesSearchQuery("Nica", "Nicaragua"), true);
    assert.equal(matchesSearchQuery("+420", "+420", "Czechia"), true);
  });

  it("matches light typos", () => {
    assert.equal(matchesSearchQuery("cestyna", "Czech Republic"), true);
  });
});
