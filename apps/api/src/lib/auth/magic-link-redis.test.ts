import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { hashMagicLinkEmail, hashMagicLinkStoredIdentifier } from "./magic-link-redis.js";

const require = createRequire(import.meta.url);

describe("magic-link hashing", () => {
  it("hashes emails in lowercase without logging the address", () => {
    const hashed = hashMagicLinkEmail("  User@Example.COM ");
    assert.equal(hashed, hashMagicLinkEmail("user@example.com"));
    assert.equal(hashed.length, 64);
    assert.doesNotMatch(hashed, /user|example/i);
  });

  it("hashes stored identifiers as SHA-256 base64url without padding", () => {
    const hashed = hashMagicLinkStoredIdentifier("plaintext-token");
    assert.doesNotMatch(hashed, /plaintext/);
    assert.doesNotMatch(hashed, /[=]/);
  });

  it("matches Better Auth magic-link defaultKeyHasher", async () => {
    const hasherUrl = pathToFileURL(
      join(dirname(require.resolve("better-auth")), "plugins/magic-link/utils.mjs"),
    ).href;
    const { defaultKeyHasher } = (await import(hasherUrl)) as {
      defaultKeyHasher: (token: string) => Promise<string>;
    };
    const token = "abcdefghijklmnopqrstuvwxyzABCDEF";
    assert.equal(hashMagicLinkStoredIdentifier(token), await defaultKeyHasher(token));
  });
});
