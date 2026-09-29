import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickRandomItems } from "./pickRandomItems.js";

describe("pickRandomItems", () => {
  it("returns a copy of all items when count is not smaller", () => {
    const items = ["a", "b", "c"] as const;
    assert.deepEqual(pickRandomItems(items, 3), ["a", "b", "c"]);
    assert.deepEqual(pickRandomItems(items, 9), ["a", "b", "c"]);
  });

  it("returns an empty list for a non-positive count", () => {
    assert.deepEqual(pickRandomItems(["a", "b"], 0), []);
  });

  it("picks a deterministic sample when random is injected", () => {
    const sequence = [0.9, 0.1, 0.5];
    let index = 0;
    const random = () => {
      const value = sequence[index] ?? 0;
      index += 1;
      return value;
    };

    assert.deepEqual(pickRandomItems(["a", "b", "c", "d"], 2, random), ["c", "b"]);
  });
});
