import { ApiError } from "@/lib/api/ApiError";

/** Server-safe check for expired or invalid API sessions. */
export function isUnauthorizedApiError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.code === "BFF_UNAUTHORIZED")
  );
}

export function isUnauthorizedResponseStatus(status: number): boolean {
  return status === 401;
}
