import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pollUntil } from "./pollUntil";

describe("pollUntil", () => {
  it("resolves true immediately when ready", async () => {
    assert.equal(await pollUntil(() => true, 1000), true);
  });

  it("resolves true on a later tick", async () => {
    let ready = false;
    setTimeout(() => {
      ready = true;
    }, 20);
    assert.equal(await pollUntil(() => ready, 500, undefined, 10), true);
  });

  it("resolves false when the predicate stays false", async () => {
    assert.equal(await pollUntil(() => false, 40, undefined, 10), false);
  });
});
