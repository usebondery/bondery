import { isApiError } from "./ApiError.js";
import type { ApiErrorTranslateFn } from "./types.js";

export function getUserFacingError(error: unknown, t: ApiErrorTranslateFn): string {
  if (isApiError(error)) {
    return error.getUserMessage(t);
  }

  if (error instanceof Error && error.name === "AbortError") {
    return t("errors.requestFailed");
  }

  return t("errors.unknown");
}
