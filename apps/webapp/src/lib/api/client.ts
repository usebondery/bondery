import { IDEMPOTENCY_KEY_HEADER, toBffApiPath } from "@bondery/helpers/globals/paths";
import { generateId } from "@bondery/helpers/ids/generate-id";
import { applyTransportErrorPolicy } from "@/lib/api/applyTransportErrorPolicy";
import {
  handleUnauthorizedSession,
  isUnauthorizedResponseStatus,
} from "@/lib/auth/handleUnauthorizedSession";
import {
  canReplayRequestBody,
  IDEMPOTENCY_ATTEMPT_LIMIT,
  idempotencyWaitSeconds,
  isRetryableIdempotencyStatus,
  methodSendsIdempotencyKey,
  readIdempotencyErrorCode,
} from "./idempotencyAttempt";
import { parseApiJsonResponse, parseApiJsonResponseOrNull } from "./parseResponse";

export { ApiError } from "@bondery/helpers/api";
export {
  applyTransportErrorPolicy,
  applyTransportResponsePolicy,
} from "./applyTransportErrorPolicy";

/**
 * One `clientApiJson` or `clientApiFetch` call is one attempt.
 * Retries inside that call reuse the same `Idempotency-Key` and the same body.
 * A later call mints a new key.
 */
async function attemptClientApi(path: string, init?: RequestInit): Promise<Response> {
  const requestInit = requestInitForAttempt(init);
  const replayable = canReplayRequestBody(requestInit.body);
  const url = toBffApiPath(path);

  for (let attempt = 0; attempt < IDEMPOTENCY_ATTEMPT_LIMIT; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, requestInit);
    } catch (error) {
      if (isAbortError(error) || !replayable || attempt >= IDEMPOTENCY_ATTEMPT_LIMIT - 1) {
        throw error;
      }
      await waitSeconds(idempotencyWaitSeconds(null, attempt), requestInit.signal);
      continue;
    }

    const decision = await classifyResponse(response);
    const retry = decision.retry && replayable && attempt < IDEMPOTENCY_ATTEMPT_LIMIT - 1;
    if (!retry) {
      return decision.response;
    }
    await cancelResponseBody(decision.response);
    await waitSeconds(idempotencyWaitSeconds(decision.retryAfter, attempt), requestInit.signal);
  }

  throw new Error("Idempotency attempt ended without a response.");
}

function requestInitForAttempt(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  if (methodSendsIdempotencyKey(init?.method) && !headers.has(IDEMPOTENCY_KEY_HEADER)) {
    headers.set(IDEMPOTENCY_KEY_HEADER, generateId());
  }
  return {
    ...init,
    credentials: init?.credentials ?? "include",
    headers,
  };
}

/**
 * Read `Retry-After` before `response.text()`.
 * A `409` body is read once, then returned on a new `Response` so the caller can read it.
 */
async function classifyResponse(response: Response): Promise<{
  response: Response;
  retry: boolean;
  retryAfter: string | null;
}> {
  const retryAfter = response.headers.get("Retry-After");
  if (response.status !== 409) {
    return {
      response,
      retry: isRetryableIdempotencyStatus(response.status, null),
      retryAfter,
    };
  }

  const bodyText = await response.text();
  return {
    response: new Response(bodyText, {
      headers: new Headers(response.headers),
      status: response.status,
      statusText: response.statusText,
    }),
    retry: isRetryableIdempotencyStatus(response.status, readIdempotencyErrorCode(bodyText)),
    retryAfter,
  };
}

/** A consumed `409` body can reject `cancel`. That rejection does not stop the retry. */
async function cancelResponseBody(response: Response): Promise<void> {
  if (!response.body) {
    return;
  }
  try {
    await response.body.cancel();
  } catch {
    // The stream is already finished.
  }
}

function waitSeconds(seconds: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    throw abortError(signal);
  }
  const ms = seconds * 1000;
  if (ms <= 0) {
    return Promise.resolve();
  }
  if (!signal) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
  const activeSignal = signal;
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(activeSignal));
    };
    const timer = setTimeout(() => {
      activeSignal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    activeSignal.addEventListener("abort", onAbort, { once: true });
  });
}

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) {
    const reason = signal.reason;
    if (reason.name === "AbortError") {
      return reason;
    }
  }
  return new DOMException("The operation was aborted.", "AbortError");
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function clientApiFetch(path: string, init?: RequestInit): Promise<Response> {
  return attemptClientApi(path, init);
}

export async function clientApiJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await attemptClientApi(path, init);
    return await parseApiJsonResponse<T>(response);
  } catch (error) {
    if (!isAbortError(error)) {
      applyTransportErrorPolicy(error);
    }
    throw error;
  }
}

/** Returns null on network failure or non-2xx — for prefetch / graceful degradation. */
export async function clientApiJsonOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await attemptClientApi(path, init);
    if (isUnauthorizedResponseStatus(response.status)) {
      void handleUnauthorizedSession();
      return null;
    }
    return parseApiJsonResponseOrNull<T>(response);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return null;
  }
}
