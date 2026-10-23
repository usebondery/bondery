import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@bondery/helpers/api";
import { errorFromSyncPushHttp, errorFromSyncPushRejected } from "./sync-displayed-error.ts";

describe("errorFromSyncPushHttp", () => {
  it("parses a catalog envelope instead of using the raw body as copy", () => {
    const error = errorFromSyncPushHttp(
      426,
      JSON.stringify({
        error: {
          code: "sync_protocol_mismatch",
          message: "This app version is out of date. Please update Bondery to continue syncing.",
          type: "invalid_request_error",
        },
      }),
    );

    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "sync_protocol_mismatch");
    assert.equal(error.status, 426);
    assert.notEqual(
      error.code,
      "This app version is out of date. Please update Bondery to continue syncing.",
    );
  });

  it("does not treat a raw HTML or text body as the toast string", () => {
    const error = errorFromSyncPushHttp(500, "Sync failed (500)");

    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "internal_server_error");
    assert.notEqual(error.code, "Sync failed (500)");
  });
});

describe("errorFromSyncPushRejected", () => {
  it("builds ApiError from a reject catalog code", () => {
    const error = errorFromSyncPushRejected({
      code: "contact_not_found",
      error: "Contact not found",
    });

    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "contact_not_found");
    assert.equal(error.developerMessage, "Contact not found");
  });

  it("does not use result.error as the displayed error when code is absent", () => {
    const error = errorFromSyncPushRejected({
      error: "Idempotency payload mismatch",
    });

    assert.ok(error instanceof Error);
    assert.equal(error instanceof ApiError, false);
    assert.notEqual((error as Error).message, "Idempotency payload mismatch");
  });
});
