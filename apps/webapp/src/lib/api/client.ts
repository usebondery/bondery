/**
 * Browser-side API client.
 *
 * Always call same-origin `/api/*` routes — never `API_URL` directly.
 * Route handlers inject the Supabase Bearer token before proxying to Fastify.
 */

import { ApiError } from "@/lib/api/ApiError";
import {
  handleUnauthorizedSession,
  isUnauthorizedApiError,
  isUnauthorizedResponseStatus,
} from "@/lib/auth/handleUnauthorizedSession";
import { parseApiJsonResponse, parseApiJsonResponseOrNull } from "./parseResponse";

export { ApiError } from "./ApiError";

export async function clientApiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(path, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
}

export async function clientApiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await clientApiFetch(path, init);
  try {
    return await parseApiJsonResponse<T>(response);
  } catch (error) {
    if (isUnauthorizedApiError(error)) {
      void handleUnauthorizedSession();
    }
    throw error;
  }
}

/** Returns null on network failure or non-2xx — for prefetch / graceful degradation. */
export async function clientApiJsonOrNull<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const response = await clientApiFetch(path, init);
    if (isUnauthorizedResponseStatus(response.status)) {
      void handleUnauthorizedSession();
      return null;
    }
    return parseApiJsonResponseOrNull<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}
