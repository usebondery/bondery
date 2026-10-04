import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSessionCreatedAtFresh, SESSION_FRESH_AGE_SECONDS } from "./session-freshness.js";

describe("isSessionCreatedAtFresh", () => {
  it("treats createdAt within freshAge as fresh", () => {
    const now = Date.parse("2026-10-02T12:00:00.000Z");
    assert.equal(isSessionCreatedAtFresh(new Date(now), now), true);
    assert.equal(
      isSessionCreatedAtFresh(new Date(now - SESSION_FRESH_AGE_SECONDS * 1000), now),
      true,
    );
  });

  it("treats createdAt older than freshAge as stale", () => {
    const now = Date.parse("2026-10-02T12:00:00.000Z");
    assert.equal(
      isSessionCreatedAtFresh(new Date(now - SESSION_FRESH_AGE_SECONDS * 1000 - 1), now),
      false,
    );
  });

  it("rejects missing createdAt", () => {
    assert.equal(isSessionCreatedAtFresh(undefined), false);
    assert.equal(isSessionCreatedAtFresh("not-a-date"), false);
  });
});
