/**
 * Per-request nonce for the `script-src` directive.
 *
 * Web Crypto only: `@bondery/helpers/security` is imported by the Next.js
 * `proxy.ts` files, which can run on the Edge runtime. `node:crypto` and
 * `Buffer` are not available there.
 *
 * The value is a random UUID rendered as base64, which is the shape the
 * website has always used. `btoa` and `Buffer#toString("base64")` agree on a
 * UUID string, so this stays byte-identical to the previous implementation.
 */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
