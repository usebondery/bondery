import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStoredMapProjection } from "./mapProjectionPreference.js";

describe("parseStoredMapProjection", () => {
  it("defaults to mercator when missing or invalid", () => {
    assert.equal(parseStoredMapProjection(undefined), "mercator");
    assert.equal(parseStoredMapProjection(null), "mercator");
    assert.equal(parseStoredMapProjection(""), "mercator");
    assert.equal(parseStoredMapProjection("flat"), "mercator");
  });

  it("accepts mercator and globe", () => {
    assert.equal(parseStoredMapProjection("mercator"), "mercator");
    assert.equal(parseStoredMapProjection("globe"), "globe");
  });
});
