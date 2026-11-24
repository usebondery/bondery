import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detachPromise } from "./async.js";

describe("detachPromise", () => {
  it("does not reject when the promise rejects and no handler is passed", async () => {
    detachPromise(Promise.reject(new Error("detached")));
    await Promise.resolve();
    assert.equal(true, true);
  });

  it("calls onRejected when the promise rejects", async () => {
    const seen: unknown[] = [];
    detachPromise(Promise.reject(new Error("reported")), (error) => {
      seen.push(error);
    });
    await Promise.resolve();
    assert.equal(seen.length, 1);
    assert.ok(seen[0] instanceof Error);
    assert.equal(seen[0].message, "reported");
  });
});
