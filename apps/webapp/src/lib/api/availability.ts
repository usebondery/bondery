import { ApiError } from "@/lib/api/ApiError";

/** Server-safe check for API gateway / upstream outage responses. */
export function isApiUnavailableResponseStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

/** Client-side check for thrown transport errors (ApiError or fetch network failure). */
export function isApiUnavailableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return isApiUnavailableResponseStatus(error.status);
  }
  if (error instanceof TypeError) {
    return true;
  }
  return false;
}
