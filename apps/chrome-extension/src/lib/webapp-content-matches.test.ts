import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { webappContentMatches } from "./webapp-content-matches";

describe("webappContentMatches", () => {
  it("always includes production and loopback hosts without a port", () => {
    assert.deepEqual(webappContentMatches("production", "http://localhost:26632"), [
      "https://app.usebondery.com/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
    ]);
  });

  it("does not add a localhost port pattern in local flavor", () => {
    assert.deepEqual(webappContentMatches("local", "http://localhost:26632"), [
      "https://app.usebondery.com/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
    ]);
  });

  it("adds a baked non-localhost origin without a port", () => {
    assert.deepEqual(webappContentMatches("staging", "https://app.beta.usebondery.com"), [
      "https://app.usebondery.com/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
      "https://app.beta.usebondery.com/*",
    ]);
  });

  it("does not duplicate 127.0.0.1 when that is the baked webapp origin", () => {
    assert.deepEqual(webappContentMatches("local", "http://127.0.0.1:26632"), [
      "https://app.usebondery.com/*",
      "http://localhost/*",
      "http://127.0.0.1/*",
    ]);
  });
});
