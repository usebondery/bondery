import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { webappContentMatches } from "./webapp-content-matches";

describe("webappContentMatches", () => {
  it("always includes production and localhost without a port", () => {
    assert.deepEqual(webappContentMatches("production", "http://localhost:26632"), [
      "https://app.usebondery.com/*",
      "http://localhost/*",
    ]);
  });

  it("does not add a localhost port pattern in local flavor", () => {
    assert.deepEqual(webappContentMatches("local", "http://localhost:26632"), [
      "https://app.usebondery.com/*",
      "http://localhost/*",
    ]);
  });

  it("adds a baked non-localhost origin without a port", () => {
    assert.deepEqual(webappContentMatches("staging", "https://app.beta.usebondery.com"), [
      "https://app.usebondery.com/*",
      "http://localhost/*",
      "https://app.beta.usebondery.com/*",
    ]);
  });
});
