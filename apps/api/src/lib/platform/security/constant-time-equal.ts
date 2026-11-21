import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Compares two secret strings in constant time.
 *
 * Use it for every compare of a secret, signature, or token against a
 * caller-supplied value. `===` stops at the first differing character, so the
 * response time leaks how much of a guess is correct.
 *
 * Both values are hashed to SHA-256 first. The digests always have the same
 * length, so the compare does not branch on input length and does not leak
 * the length of `expected`.
 *
 * Enforced by `biome/plugins/no-unsafe-secret-compare.grit`.
 */
export function constantTimeEqual(actual: string, expected: string): boolean {
  return timingSafeEqual(sha256(actual), sha256(expected));
}
