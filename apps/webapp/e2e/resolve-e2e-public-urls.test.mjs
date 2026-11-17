import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sharedSite } from "./resolve-e2e-public-urls.mjs";

describe("sharedSite", () => {
  it("accepts the same host", () => {
    assert.equal(sharedSite("localhost", "localhost"), "localhost");
    assert.equal(sharedSite("usebondery.test", "usebondery.test"), "usebondery.test");
  });

  it("accepts sibling dev hosts and returns the shared parent", () => {
    assert.equal(sharedSite("api.usebondery.test", "app.usebondery.test"), "usebondery.test");
  });

  it("rejects different sites", () => {
    assert.equal(sharedSite("api.usebondery.test", "app.example.com"), null);
  });

  it("rejects mismatched IPs and bare hosts", () => {
    assert.equal(sharedSite("127.0.0.1", "127.0.0.2"), null);
    assert.equal(sharedSite("localhost", "app.usebondery.test"), null);
  });
});
