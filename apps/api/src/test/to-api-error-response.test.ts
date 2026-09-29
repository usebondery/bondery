import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../domains/_shared/context.js";
import { GENERIC_500_MESSAGE } from "../lib/platform/errors/codes.js";
import { toApiErrorResponse } from "../lib/platform/errors/to-api-error-response.js";

describe("toApiErrorResponse", () => {
  it("maps DomainError 4xx with catalog code, type, message, and doc_url", () => {
    const error = new DomainError("Contact not found", 404, "contact_not_found");
    const body = toApiErrorResponse(error, "req-4xx");

    assert.equal(body.error.code, "contact_not_found");
    assert.equal(body.error.message, "Contact not found");
    assert.equal(body.error.type, "not_found_error");
    assert.equal(body.error.request_id, "req-4xx");
    assert.match(body.error.doc_url, /\/docs\/api\/errors\/contact_not_found$/);
  });

  it("sanitizes DomainError 5xx to GENERIC_500_MESSAGE and keeps the catalog code", () => {
    const error = new DomainError("postgres connection failed", 500, "contact_update_failed");
    const body = toApiErrorResponse(error, "req-5xx");

    assert.equal(body.error.message, GENERIC_500_MESSAGE);
    assert.equal(body.error.code, "contact_update_failed");
    assert.equal(body.error.request_id, "req-5xx");
    assert.equal(body.error.message.includes("postgres"), false);
  });

  it("maps unknown Error to internal_server_error and GENERIC_500_MESSAGE", () => {
    const body = toApiErrorResponse(new Error("something broke"), "req-unknown");

    assert.equal(body.error.code, "internal_server_error");
    assert.equal(body.error.message, GENERIC_500_MESSAGE);
    assert.equal(body.error.type, "api_error");
    assert.equal(body.error.request_id, "req-unknown");
    assert.equal(body.error.message.includes("something broke"), false);
  });
});
