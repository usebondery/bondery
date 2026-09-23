import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@bondery/helpers/api";
import { isPageLoadFailure, throwIfPageCannotRender } from "./pageLoadFailure.js";

function apiError(status: number, code: string): ApiError {
  return new ApiError({
    code,
    developerMessage: code,
    status,
  });
}

describe("isPageLoadFailure", () => {
  it("is true for hop-down statuses and network TypeError", () => {
    assert.equal(isPageLoadFailure(new TypeError("Failed to fetch")), true);
    assert.equal(isPageLoadFailure(apiError(502, "internal_server_error")), true);
    assert.equal(isPageLoadFailure(apiError(503, "service_unavailable")), true);
    assert.equal(isPageLoadFailure(apiError(504, "gateway_timeout")), true);
  });

  it("is true for other 5xx", () => {
    assert.equal(isPageLoadFailure(apiError(500, "internal_error")), true);
  });

  it("is false for 401, 403, and missing contact", () => {
    assert.equal(isPageLoadFailure(apiError(401, "auth_required")), false);
    assert.equal(isPageLoadFailure(apiError(403, "forbidden")), false);
    assert.equal(isPageLoadFailure(apiError(404, "not_found")), false);
    assert.equal(isPageLoadFailure(apiError(404, "contact_not_found")), false);
  });

  it("is false for other 4xx", () => {
    assert.equal(isPageLoadFailure(apiError(400, "invalid_request")), false);
    assert.equal(isPageLoadFailure(apiError(429, "rate_limited")), false);
  });
});

describe("throwIfPageCannotRender", () => {
  it("throws only when there is no cached data", () => {
    const hopDown = apiError(503, "service_unavailable");
    assert.equal(throwIfPageCannotRender(hopDown, { state: { data: undefined } }), true);
    assert.equal(throwIfPageCannotRender(hopDown, { state: { data: { contacts: [] } } }), false);
  });

  it("does not throw for forbidden even without cache", () => {
    assert.equal(
      throwIfPageCannotRender(apiError(403, "forbidden"), { state: { data: undefined } }),
      false,
    );
  });
});
