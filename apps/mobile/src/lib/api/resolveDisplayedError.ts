import {
  type ApiErrorTranslateFn,
  getUserFacingError,
  isUnauthorizedApiError,
} from "@bondery/helpers/api";
import { AuthRequiredError } from "../auth/session";
import { isTransportUnavailableError } from "./transport-unavailable-error";

/**
 * One copy path for user-facing mobile failures. Return `null` when transport already
 * ended the session so callers skip the card and the toast.
 */
export function resolveDisplayedError(error: unknown, t: ApiErrorTranslateFn): string | null {
  if (error instanceof AuthRequiredError || isUnauthorizedApiError(error)) {
    return null;
  }

  if (isTransportUnavailableError(error)) {
    if (error.kind === "offline") {
      return t("errors.connection");
    }

    return t("errors.apiUnreachable");
  }

  return getUserFacingError(error, t);
}
