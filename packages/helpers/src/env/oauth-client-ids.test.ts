import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertDistinctFirstPartyOAuthClientIds } from "./oauth-client-ids.js";

const MUST_BE_DISTINCT_RE = /must be distinct/;

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
      MUST_BE_DISTINCT_RE,
    );
    assert.throws(
      () => assertDistinctFirstPartyOAuthClientIds("  same-id  ", "same-id"),
      MUST_BE_DISTINCT_RE,
    );
  });
});
