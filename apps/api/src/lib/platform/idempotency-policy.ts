/**
 * Pure idempotency rules. The Fastify hook and the tests share this module.
 * No database access lives here.
 */

import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { API_ROUTES, BETTER_AUTH_BASE_PATH } from "@bondery/helpers/globals/paths";

/** Lease length passed to `claim_idempotency_key` and `refresh_idempotency_lease`. */
export const IDEMPOTENCY_LEASE_SECONDS = 60;

/** Refresh interval while the claimed request is still open. */
export const IDEMPOTENCY_LEASE_REFRESH_MS = 20_000;

/** Stored JSON body limit. Larger payloads set `response_omitted`. */
export const IDEMPOTENCY_MAX_RESPONSE_BYTES = 1_048_576;

export const IDEMPOTENCY_REPLAYED_HEADER = "Idempotent-Replayed";

/** Routes that reject `Idempotency-Key`. SSE chat cannot store a replay body. */
export const IDEMPOTENCY_EXEMPT_ROUTES = [{ method: "POST", url: API_ROUTES.CHAT }] as const;

const PRINTABLE_ASCII_KEY = /^[\x21-\x7E]{1,255}$/;

export const EMPTY_BODY_SHA256 = sha256Hex(Buffer.alloc(0));

export type IdempotencyCompletion = "release" | "store";

export function sha256Hex(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashBody(bytes: Uint8Array): string {
  return sha256Hex(bytes);
}

export function isValidIdempotencyKey(value: string): boolean {
  return PRINTABLE_ASCII_KEY.test(value);
}

/**
 * Returns the header value when it matches the key rules.
 * Absent and invalid values both return null. The hook reports invalid keys.
 */
export function readValidIdempotencyKey(header: string | string[] | undefined): string | null {
  if (typeof header !== "string" || !isValidIdempotencyKey(header)) {
    return null;
  }
  return header;
}

export function isIdempotencyMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === "POST" || upper === "PATCH";
}

export function isUnderBetterAuthPath(pathname: string): boolean {
  return pathname === BETTER_AUTH_BASE_PATH || pathname.startsWith(`${BETTER_AUTH_BASE_PATH}/`);
}

export function splitRequestUrl(url: string): { pathname: string; rawQuery: string } {
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) {
    return { pathname: url, rawQuery: "" };
  }
  return { pathname: url.slice(0, queryIndex), rawQuery: url.slice(queryIndex + 1) };
}

/**
 * sha256 hex of method, pathname, raw query, and the sha256 hex of the raw body.
 * JSON key order is part of the body hash because the hash covers raw bytes.
 */
export function buildIdempotencyFingerprint(input: {
  bodySha256: string;
  method: string;
  pathname: string;
  rawQuery: string;
}): string {
  const material = `${input.method.toUpperCase()}\n${input.pathname}\n${input.rawQuery}\n${input.bodySha256}`;
  return sha256Hex(material);
}

/**
 * Stripe shares one account across users, so the client key is namespaced by user id.
 * The result is 64 hex characters.
 */
export function stripeIdempotencyKey(userId: string, clientKey: string): string {
  return sha256Hex(`${userId}:${clientKey}`);
}

/**
 * Status codes stored on the idempotency row, or released so the client can retry.
 * Codes outside the store list are released.
 */
export function idempotencyCompletionForStatus(statusCode: number): IdempotencyCompletion {
  if (statusCode >= 200 && statusCode < 300) {
    return "store";
  }
  if (statusCode === 400 || statusCode === 404 || statusCode === 409 || statusCode === 422) {
    return "store";
  }
  return "release";
}

/**
 * `claim_idempotency_key` does not return the remaining lease.
 * The header uses the full lease length. The value is at least 1 second.
 */
export function idempotencyRetryAfterSeconds(remainingSeconds?: number): number {
  const remaining = remainingSeconds ?? IDEMPOTENCY_LEASE_SECONDS;
  if (!Number.isFinite(remaining)) {
    return IDEMPOTENCY_LEASE_SECONDS;
  }
  return Math.max(1, Math.ceil(remaining));
}

export function responseForStorage(payload: unknown): { body: unknown; omitted: boolean } {
  if (isStreamPayload(payload)) {
    return { body: null, omitted: true };
  }

  if (payload === undefined || payload === null) {
    return { body: null, omitted: false };
  }

  if (typeof payload === "string" || Buffer.isBuffer(payload)) {
    const text = typeof payload === "string" ? payload : payload.toString("utf8");
    if (Buffer.byteLength(text) > IDEMPOTENCY_MAX_RESPONSE_BYTES) {
      return { body: null, omitted: true };
    }
    try {
      return { body: JSON.parse(text) as unknown, omitted: false };
    } catch {
      return { body: text, omitted: false };
    }
  }

  try {
    const text = JSON.stringify(payload);
    if (text === undefined || Buffer.byteLength(text) > IDEMPOTENCY_MAX_RESPONSE_BYTES) {
      return { body: null, omitted: true };
    }
    return { body: payload, omitted: false };
  } catch {
    return { body: null, omitted: true };
  }
}

function isStreamPayload(payload: unknown): boolean {
  if (payload instanceof Readable) {
    return true;
  }
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  return typeof (payload as { getReader?: unknown }).getReader === "function";
}
