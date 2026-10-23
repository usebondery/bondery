import { ApiError, buildApiErrorFromResponse } from "@bondery/helpers/api";

/**
 * Parse a non-OK sync HTTP body into `ApiError`. Do not use the raw body as toast copy.
 */
export function errorFromSyncPushHttp(status: number, bodyText: string): ApiError {
  return buildApiErrorFromResponse({
    bodyText,
    status,
  });
}

/**
 * Build a structured reject error. If `code` is absent, fall through to `errors.unknown`.
 * Never pass `result.error` to the toast.
 */
export function errorFromSyncPushRejected(result: { code?: string; error: string }): unknown {
  if (!result.code) {
    return new Error("sync_rejected");
  }

  return new ApiError({
    code: result.code,
    developerMessage: result.error,
    status: 400,
  });
}
