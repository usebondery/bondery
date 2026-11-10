import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  buildIdempotencyFingerprint,
  EMPTY_BODY_SHA256,
  hashBody,
  IDEMPOTENCY_EXEMPT_ROUTES,
  IDEMPOTENCY_LEASE_SECONDS,
  IDEMPOTENCY_MAX_RESPONSE_BYTES,
  idempotencyCompletionForStatus,
  idempotencyRetryAfterSeconds,
  isValidIdempotencyKey,
  responseForStorage,
  sha256Hex,
  stripeIdempotencyKey,
} from "../lib/platform/idempotency-policy.js";

describe("idempotency policy", () => {
  it("accepts printable ASCII keys and rejects everything else", () => {
    assert.equal(isValidIdempotencyKey("a"), true);
    assert.equal(isValidIdempotencyKey("!"), true);
    assert.equal(isValidIdempotencyKey("~"), true);
    assert.equal(isValidIdempotencyKey("a".repeat(255)), true);
    assert.equal(isValidIdempotencyKey(""), false);
    assert.equal(isValidIdempotencyKey("a".repeat(256)), false);
    assert.equal(isValidIdempotencyKey("has space"), false);
    assert.equal(isValidIdempotencyKey("line\nbreak"), false);
    assert.equal(isValidIdempotencyKey("tab\tchar"), false);
    assert.equal(isValidIdempotencyKey("del\u007f"), false);
  });

  it("hashes the raw body and keeps JSON key order in the fingerprint", () => {
    const first = Buffer.from('{"z":1,"a":2}');
    const second = Buffer.from('{"a":2,"z":1}');
    assert.equal(hashBody(Buffer.alloc(0)), EMPTY_BODY_SHA256);
    assert.notEqual(hashBody(first), hashBody(second));

    const fingerprint = buildIdempotencyFingerprint({
      bodySha256: hashBody(first),
      method: "post",
      pathname: "/notes",
      rawQuery: "b=2&a=1",
    });
    assert.equal(fingerprint, sha256Hex(`POST\n/notes\nb=2&a=1\n${hashBody(first)}`));
  });

  it("stores success and selected client errors, and releases the rest", () => {
    for (const status of [200, 201, 204, 400, 404, 409, 422]) {
      assert.equal(idempotencyCompletionForStatus(status), "store", String(status));
    }
    for (const status of [401, 403, 408, 429, 500, 503]) {
      assert.equal(idempotencyCompletionForStatus(status), "release", String(status));
    }
  });

  it("omits streams and bodies over 1 MiB", () => {
    assert.equal(responseForStorage(new PassThrough()).omitted, true);
    assert.deepEqual(responseForStorage({ ok: true }), { body: { ok: true }, omitted: false });
    const limit = "x".repeat(IDEMPOTENCY_MAX_RESPONSE_BYTES);
    assert.equal(responseForStorage(limit).omitted, false);
    assert.equal(responseForStorage(`${limit}x`).omitted, true);
  });

  it("namespaces the Stripe key by user id", () => {
    const first = stripeIdempotencyKey("user-a", "client-key");
    const second = stripeIdempotencyKey("user-b", "client-key");
    assert.equal(first.length, 64);
    assert.match(first, /^[0-9a-f]{64}$/);
    assert.notEqual(first, second);
    assert.equal(first, sha256Hex("user-a:client-key"));
  });

  it("uses the lease length when the claim does not return a remainder", () => {
    assert.equal(idempotencyRetryAfterSeconds(), IDEMPOTENCY_LEASE_SECONDS);
    assert.equal(idempotencyRetryAfterSeconds(0), 1);
    assert.equal(idempotencyRetryAfterSeconds(1.2), 2);
  });

  it("lists only POST /chat as exempt", () => {
    assert.deepEqual(IDEMPOTENCY_EXEMPT_ROUTES, [{ method: "POST", url: API_ROUTES.CHAT }]);
  });
});
