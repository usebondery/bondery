import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { firstSearchParam, parseAuthCallbackSearch } from "./parse-auth-callback-search.js";

describe("firstSearchParam", () => {
  it("returns a trimmed string", () => {
    assert.equal(firstSearchParam("  abc  "), "abc");
  });

  it("returns the first non-empty array entry", () => {
    assert.equal(firstSearchParam(["", "  token-1  "]), "token-1");
  });

  it("returns null for empty values", () => {
    assert.equal(firstSearchParam(undefined), null);
    assert.equal(firstSearchParam(""), null);
    assert.equal(firstSearchParam(["", "   "]), null);
  });
});

describe("parseAuthCallbackSearch", () => {
  it("reads cookie, error, and token query params", () => {
    assert.deepEqual(
      parseAuthCallbackSearch({
        cookie: "better-auth.session_token=abc",
        error: "INVALID_TOKEN",
        token: ["", "magic-token"],
      }),
      {
        cookie: "better-auth.session_token=abc",
        error: "INVALID_TOKEN",
        token: "magic-token",
      },
    );
  });

  it("returns nulls when the callback has no auth params", () => {
    assert.deepEqual(parseAuthCallbackSearch({}), {
      cookie: null,
      error: null,
      token: null,
    });
  });

  it("decodes a percent-encoded Set-Cookie header", () => {
    assert.equal(
      parseAuthCallbackSearch({
        cookie: "better-auth.session_token%3Dabc%3B%20Path%3D%2F",
      }).cookie,
      "better-auth.session_token=abc; Path=/",
    );
  });
});
