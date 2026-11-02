import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRequestNextPage } from "./shouldRequestNextPage.js";

describe("shouldRequestNextPage", () => {
  it("requests the next page only when the sentinel is in view and the next page is idle", () => {
    assert.equal(shouldRequestNextPage(true, false, false, true), true);
  });

  it("blocks when there is no next page", () => {
    assert.equal(shouldRequestNextPage(false, false, false, true), false);
  });

  it("blocks while the next page is in flight", () => {
    assert.equal(shouldRequestNextPage(true, true, false, true), false);
  });

  it("blocks after the next page failed", () => {
    assert.equal(shouldRequestNextPage(true, false, true, true), false);
  });

  it("blocks when the sentinel is outside the viewport", () => {
    assert.equal(shouldRequestNextPage(true, false, false, false), false);
  });
});
