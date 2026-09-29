import { isApiError } from "@bondery/helpers/api";

/** Missing people rows use `contact_not_found`; keep `not_found` for older API responses. */
export function isMissingContactError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.code === "contact_not_found" || error.code === "not_found";
  }

  return error instanceof Error && error.message === "Contact not found";
}
