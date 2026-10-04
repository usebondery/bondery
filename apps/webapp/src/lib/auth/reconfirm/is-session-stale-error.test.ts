import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@bondery/helpers/api";
import { isSessionStaleError } from "./is-session-stale-error.js";

describe("isSessionStaleError", () => {
  it("treats Better Auth SESSION_NOT_FRESH as session_stale, not a 401", () => {
    assert.equal(isSessionStaleError({ code: "SESSION_NOT_FRESH" }), true);
    assert.equal(isSessionStaleError({ code: "SESSION_REQUIRED" }), true);
  });

  it("treats API session_not_fresh as stale", () => {
    assert.equal(
      isSessionStaleError(
        new ApiError({
          code: "session_not_fresh",
          developerMessage: "stale",
          status: 403,
        }),
      ),
      true,
    );
  });

  it("does not treat 401 auth_required as stale", () => {
    assert.equal(
      isSessionStaleError(
        new ApiError({
          code: "auth_required",
          developerMessage: "Unauthorized",
          status: 401,
        }),
      ),
      false,
    );
    assert.equal(isSessionStaleError({ code: "UNAUTHORIZED", status: 401 }), false);
  });
});
