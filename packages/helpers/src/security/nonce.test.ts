import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createNonce } from "./nonce.js";

describe("createNonce", () => {
  it("returns a base64-encoded UUID", () => {
    const nonce = createNonce();

    assert.match(nonce, /^[A-Za-z0-9+/]+=*$/);
    // A UUID string is 36 bytes, which base64 encodes to 48 characters.
    assert.equal(nonce.length, 48);
  });

  it("returns a different value on each call", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => createNonce()));

    assert.equal(nonces.size, 50);
  });
});
