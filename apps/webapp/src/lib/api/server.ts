import { API_URL } from "@/lib/config";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";
import {
  applyServerTransportErrorPolicy,
  applyServerTransportResponsePolicy,
} from "@/lib/api/applyServerTransportPolicy";
import { handleServerUnauthorizedSession } from "@/lib/auth/handleServerUnauthorizedSession";
import { isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";
import { parseApiJsonResponse, parseApiJsonResponseOrNull } from "./parseResponse";

export { ApiError } from "./ApiError";
export {
  applyServerTransportErrorPolicy,
  applyServerTransportResponsePolicy,
} from "@/lib/api/applyServerTransportPolicy";

export type ServerApiFetchOptions = {
  /** Next.js fetch cache options passed through to fetch(). */
  next?: { tags?: string[]; revalidate?: number | false };
  cache?: RequestCache;
  /**
   * Default true for RSC. When true, 401/outage signals redirect via transport policy.
   * Set false for BFF routes and routing probes (getAppBootstrap).
   */
  transportPolicy?: boolean;
};

function resolveServerUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return `${API_URL}${path}`;
  }

  if (path.startsWith("/")) {
    return `${API_URL}${path}`;
  }

  return `${API_URL}/api/${path}`;
}

async function buildServerHeaders(init: RequestInit | undefined): Promise<Headers> {
  const headers = new Headers(init?.headers);
  const session = await resolveServerSession();

  if (session.status === "ok") {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  return headers;
}

export async function serverApiFetch(
  path: string,
  init?: RequestInit,
  options: ServerApiFetchOptions = {},
): Promise<Response> {
  const { transportPolicy = true, next, cache } = options;
  const url = resolveServerUrl(path);
  const headers = await buildServerHeaders(init);

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      ...(next !== undefined ? { next } : {}),
      ...(cache !== undefined ? { cache } : {}),
    });

    if (transportPolicy) {
      await applyServerTransportResponsePolicy(response);
    }

    return response;
  } catch (error) {
    if (transportPolicy) {
      await applyServerTransportErrorPolicy(error);
    }
    throw error;
  }
}

export async function serverApiJson<T>(
  path: string,
  init?: RequestInit,
  options: ServerApiFetchOptions = {},
): Promise<T> {
  try {
    const response = await serverApiFetch(path, init, options);
    return await parseApiJsonResponse<T>(response);
  } catch (error) {
    if (options.transportPolicy !== false) {
      await applyServerTransportErrorPolicy(error);
    }
    throw error;
  }
}

/** Returns null on network failure or non-2xx — for prefetch / graceful degradation. */
export async function serverApiJsonOrNull<T>(
  path: string,
  init?: RequestInit,
  options: ServerApiFetchOptions = {},
): Promise<T | null> {
  try {
    const response = await serverApiFetch(path, init, {
      ...options,
      transportPolicy: false,
    });

    if (isUnauthorizedResponseStatus(response.status)) {
      await handleServerUnauthorizedSession();
    }

    return parseApiJsonResponseOrNull<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    return null;
  }
}
