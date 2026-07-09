import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAMPLE_CONTACT } from "@bondery/schemas/openapi/fixtures/entities";
import type { FastifyRequest } from "fastify";
import { DomainError } from "../domains/_shared/context.js";
import { unauthorized } from "../lib/platform/errors/http-errors.js";
import { mapErrorToResponse } from "../lib/platform/errors/map-to-response.js";
import { SyncConflictError } from "../lib/sync/conflict.js";

function mockRequest(id = "test-req-id"): FastifyRequest {
  return {
    authUser: { email: "u@example.com", id: "user-1" },
    id,
    log: { error: () => {} },
  } as unknown as FastifyRequest;
}

describe("mapErrorToResponse", () => {
  it("maps DomainError 404 with nested error body", () => {
    const error = new DomainError("Contact not found", 404, "contact_not_found");
    const { statusCode, body } = mapErrorToResponse(error, mockRequest());

    assert.equal(statusCode, 404);
    assert.equal(body.error.code, "contact_not_found");
    assert.equal(body.error.message, "Contact not found");
    assert.equal(body.error.type, "not_found_error");
    assert.equal(body.error.request_id, "test-req-id");
    assert.match(String(body.error.doc_url), /\/docs\/api\/errors\/contact_not_found$/);
  });

  it("sanitizes DomainError 500 — generic message, code, request_id, no leak", () => {
    const error = new DomainError("postgres connection failed", 500, "contact_update_failed");
    const { statusCode, body } = mapErrorToResponse(error, mockRequest("req-500"));

    assert.equal(statusCode, 500);
    assert.equal(body.error.message, "Internal Server Error");
    assert.equal(body.error.code, "contact_update_failed");
    assert.equal(body.error.request_id, "req-500");
    assert.equal(String(body.error.message).includes("postgres"), false);
  });

  it("maps unauthorized helper with auth_required", () => {
    const error = unauthorized("Unauthorized — Please log in", "auth_required");
    const { statusCode, body } = mapErrorToResponse(error, mockRequest());

    assert.equal(statusCode, 401);
    assert.equal(body.error.code, "auth_required");
    assert.equal(body.error.message, "Unauthorized — Please log in");
  });

  it("maps SyncConflictError with sync_conflict and contact details", () => {
    const error = new SyncConflictError("Contact was modified on another device", EXAMPLE_CONTACT);
    const { statusCode, body } = mapErrorToResponse(error, mockRequest());

    assert.equal(statusCode, 409);
    assert.equal(body.error.code, "sync_conflict");
    assert.equal(body.error.message, "Contact was modified on another device");
    assert.ok(body.error.details);
    assert.ok((body.error.details as { contact: unknown }).contact);
  });

  it("maps validation errors with validation_error and param", () => {
    const error = Object.assign(new Error("body.email Invalid input"), {
      validation: [{ message: "Invalid input" }],
    });
    const { statusCode, body } = mapErrorToResponse(error, mockRequest());

    assert.equal(statusCode, 400);
    assert.equal(body.error.code, "validation_error");
    assert.equal(body.error.param, "body.email");
    assert.equal(body.error.message, "body.email Invalid input");
  });

  it("maps rate limit with rate_limit_exceeded and retry_after", () => {
    const error = Object.assign(new Error("Rate limit exceeded. Retry in 42 seconds."), {
      code: "rate_limit_exceeded",
      retryAfter: 42,
      statusCode: 429,
    });
    const { statusCode, body } = mapErrorToResponse(error, mockRequest());

    assert.equal(statusCode, 429);
    assert.equal(body.error.code, "rate_limit_exceeded");
    assert.equal(body.error.retry_after, 42);
  });

  it("maps unknown errors with internal_server_error and request_id", () => {
    const error = new Error("something broke");
    const { statusCode, body } = mapErrorToResponse(error, mockRequest("req-unknown"));

    assert.equal(statusCode, 500);
    assert.equal(body.error.code, "internal_server_error");
    assert.equal(body.error.message, "Internal Server Error");
    assert.equal(body.error.request_id, "req-unknown");
  });
});
