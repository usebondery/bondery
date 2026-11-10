/**
 * Pure idempotency rules for the webapp client.
 * Tests call these functions without a browser or a server.
 */

/** One call plus two retries. */
export const IDEMPOTENCY_ATTEMPT_LIMIT = 3;

/** Cap for one `Retry-After` wait. */
export const IDEMPOTENCY_MAX_WAIT_SECONDS = 60;

const IDEMPOTENCY_IN_PROGRESS_CODE = "idempotency_key_in_progress";

/** `POST` and `PATCH` get a key. Other methods do not. */
export function methodSendsIdempotencyKey(method: string | undefined): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "POST" || normalized === "PATCH";
}

/**
 * Retry a network failure, `408`, `429`, `5xx`, or `409` `idempotency_key_in_progress`.
 * `401`, `403`, `422`, and any other `409` stop the attempt.
 */
export function isRetryableIdempotencyStatus(status: number, errorCode: string | null): boolean {
  if (status === 408 || status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }
  return status === 409 && errorCode === IDEMPOTENCY_IN_PROGRESS_CODE;
}

/** Read `error.code` from `{ error: { code, message } }`. */
export function readIdempotencyErrorCode(bodyText: string): string | null {
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const error = (parsed as { error?: unknown }).error;
    if (!error || typeof error !== "object") {
      return null;
    }
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
}

/**
 * Wait `Retry-After` seconds when the header is a finite number.
 * Cap one wait at 60 seconds.
 * An absent or non-numeric header waits 1 second, then 2 seconds.
 */
export function idempotencyWaitSeconds(
  retryAfterHeader: string | null,
  retryIndex: number,
): number {
  if (retryAfterHeader !== null) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds, IDEMPOTENCY_MAX_WAIT_SECONDS);
    }
  }
  return retryIndex <= 0 ? 1 : 2;
}

/** `FormData` and string bodies can be sent again. A stream cannot. */
export function canReplayRequestBody(body: BodyInit | null | undefined): boolean {
  if (body == null) {
    return true;
  }
  if (typeof body === "string") {
    return true;
  }
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return true;
  }
  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return true;
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return true;
  }
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return true;
  }
  return false;
}
