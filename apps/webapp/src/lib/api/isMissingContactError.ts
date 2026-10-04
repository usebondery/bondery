import { isApiError } from "@bondery/helpers/api";

/** Missing people rows use `contact_not_found`; keep `not_found` for older API responses. */
export function isMissingContactError(error: unknown): boolean {
  return isApiError(error) && (error.code === "contact_not_found" || error.code === "not_found");
}
