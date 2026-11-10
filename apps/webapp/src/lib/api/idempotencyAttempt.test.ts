import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReplayRequestBody,
  IDEMPOTENCY_MAX_WAIT_SECONDS,
  idempotencyWaitSeconds,
  isRetryableIdempotencyStatus,
  methodSendsIdempotencyKey,
  readIdempotencyErrorCode,
} from "./idempotencyAttempt.js";

describe("methodSendsIdempotencyKey", () => {
  it("sends a key for POST and PATCH", () => {
    assert.equal(methodSendsIdempotencyKey("POST"), true);
    assert.equal(methodSendsIdempotencyKey("post"), true);
    assert.equal(methodSendsIdempotencyKey("PATCH"), true);
    assert.equal(methodSendsIdempotencyKey("patch"), true);
  });

  it("does not send a key for GET, PUT, or DELETE", () => {
    assert.equal(methodSendsIdempotencyKey(undefined), false);
    assert.equal(methodSendsIdempotencyKey("GET"), false);
    assert.equal(methodSendsIdempotencyKey("PUT"), false);
    assert.equal(methodSendsIdempotencyKey("DELETE"), false);
  });
});

describe("isRetryableIdempotencyStatus", () => {
  it("retries 408, 429, 5xx, and in-progress 409", () => {
    assert.equal(isRetryableIdempotencyStatus(408, null), true);
    assert.equal(isRetryableIdempotencyStatus(429, null), true);
    assert.equal(isRetryableIdempotencyStatus(500, null), true);
    assert.equal(isRetryableIdempotencyStatus(503, null), true);
    assert.equal(isRetryableIdempotencyStatus(409, "idempotency_key_in_progress"), true);
  });

  it("does not retry auth, validation, or other 409 codes", () => {
    assert.equal(isRetryableIdempotencyStatus(401, null), false);
    assert.equal(isRetryableIdempotencyStatus(403, null), false);
    assert.equal(isRetryableIdempotencyStatus(422, "idempotency_key_mismatch"), false);
    assert.equal(isRetryableIdempotencyStatus(409, "conflict"), false);
    assert.equal(isRetryableIdempotencyStatus(409, null), false);
    assert.equal(isRetryableIdempotencyStatus(200, null), false);
  });
});

describe("idempotencyWaitSeconds", () => {
  it("uses 1 second and then 2 seconds when Retry-After is absent", () => {
    assert.equal(idempotencyWaitSeconds(null, 0), 1);
    assert.equal(idempotencyWaitSeconds(null, 1), 2);
  });

  it("waits the Retry-After seconds and caps one wait at 60", () => {
    assert.equal(idempotencyWaitSeconds("0", 0), 0);
    assert.equal(idempotencyWaitSeconds("15", 0), 15);
    assert.equal(idempotencyWaitSeconds("120", 1), IDEMPOTENCY_MAX_WAIT_SECONDS);
  });

  it("falls back when Retry-After is not a number", () => {
    assert.equal(idempotencyWaitSeconds("Wed, 21 Oct 2015 07:28:00 GMT", 0), 1);
    assert.equal(idempotencyWaitSeconds("Wed, 21 Oct 2015 07:28:00 GMT", 1), 2);
  });
});

describe("readIdempotencyErrorCode", () => {
  it("reads error.code", () => {
    assert.equal(
      readIdempotencyErrorCode('{"error":{"code":"idempotency_key_in_progress","message":"wait"}}'),
      "idempotency_key_in_progress",
    );
    assert.equal(readIdempotencyErrorCode("not-json"), null);
  });
});

describe("canReplayRequestBody", () => {
  it("replays FormData and strings", () => {
    assert.equal(canReplayRequestBody(undefined), true);
    assert.equal(canReplayRequestBody('{"a":1}'), true);
    assert.equal(canReplayRequestBody(new FormData()), true);
  });

  it("does not replay a stream", () => {
    const stream = new ReadableStream();
    assert.equal(canReplayRequestBody(stream), false);
  });
});
