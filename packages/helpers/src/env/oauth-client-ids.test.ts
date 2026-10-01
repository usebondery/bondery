import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertDistinctFirstPartyOAuthClientIds } from "./oauth-client-ids.js";

describe("assertDistinctFirstPartyOAuthClientIds", () => {
  it("allows distinct ids", () => {
    assert.doesNotThrow(() =>
      assertDistinctFirstPartyOAuthClientIds("extension-client", "webapp-client"),
    );
  });

  it("no-ops when either id is missing", () => {
    assert.doesNotThrow(() =>
      assertDistinctFirstPartyOAuthClientIds("extension-client", undefined),
    );
    assert.doesNotThrow(() => assertDistinctFirstPartyOAuthClientIds(undefined, "webapp-client"));
    assert.doesNotThrow(() => assertDistinctFirstPartyOAuthClientIds("  ", "webapp-client"));
  });

  it("rejects a shared id", () => {
    assert.throws(
      () => assertDistinctFirstPartyOAuthClientIds("same-id", "same-id"),
      /must be distinct/,
    );
    assert.throws(
      () => assertDistinctFirstPartyOAuthClientIds("  same-id  ", "same-id"),
      /must be distinct/,
    );
  });
});
