import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../domains/_shared/context.js";
import { badRequest, conflict, payloadTooLarge } from "../lib/platform/errors/http-errors.js";
import { toApiErrorResponse } from "../lib/platform/errors/to-api-error-response.js";

describe("http error factories", () => {
  const original = new Error("unique constraint failed");

  it("badRequest keeps status and code, and carries the cause", () => {
    const error = badRequest("Invalid relationship data", "relationship_invalid", original);
    assert.ok(error instanceof DomainError);
    assert.equal(error.statusCode, 400);
    assert.equal(error.code, "relationship_invalid");
    assert.equal(error.cause, original);
  });

  it("conflict keeps status and code, and carries the cause", () => {
    const error = conflict("Tag label already exists", "tag_label_exists", original);
    assert.equal(error.statusCode, 409);
    assert.equal(error.code, "tag_label_exists");
    assert.equal(error.cause, original);
  });

  it("payloadTooLarge answers 413", () => {
    const error = payloadTooLarge("File too large.", "validation_error", original);
    assert.equal(error.statusCode, 413);
    assert.equal(error.cause, original);
  });

  it("the cause never reaches the response body", () => {
    const body = toApiErrorResponse(
      conflict("Tag label already exists", "tag_label_exists", original),
      "req_1",
    );
    assert.equal(body.error.code, "tag_label_exists");
    assert.equal(body.error.message, "Tag label already exists");
    assert.ok(!JSON.stringify(body).includes("unique constraint failed"));
  });

  it("works without a cause", () => {
    const error = conflict("Tag label already exists", "tag_label_exists");
    assert.equal(error.cause, undefined);
  });
});
