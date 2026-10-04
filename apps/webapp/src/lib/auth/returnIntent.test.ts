import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSafeReturnPath, parseReturnIntent } from "./returnIntent.js";

describe("isSafeReturnPath", () => {
  it("allows in-app paths", () => {
    assert.equal(isSafeReturnPath("/app/people"), true);
  });

  it("does not treat OAuth consent as a webapp return intent", () => {
    assert.equal(isSafeReturnPath("/oauth/consent?client_id=abc"), false);
  });

  it("does not treat /confirm step-up as a post-login return path", () => {
    assert.equal(isSafeReturnPath("/confirm"), false);
    assert.equal(isSafeReturnPath("/confirm?action=delete_account"), false);
  });

  it("rejects oversized return paths so a signed oauth_query cannot hide in redirect", () => {
    const stuffed = `/app/people?${"x".repeat(2_100)}`;
    assert.equal(isSafeReturnPath(stuffed), false);
    assert.equal(parseReturnIntent(new URLSearchParams({ redirect: stuffed })), null);
  });
});
