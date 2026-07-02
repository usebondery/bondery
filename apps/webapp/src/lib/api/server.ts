import { API_URL } from "@/lib/config";
import { resolveServerSession } from "@/lib/auth/resolveServerSession";
import { parseApiJsonResponse, parseApiJsonResponseOrNull } from "./parseResponse";

export { ApiError } from "./ApiError";

export type ServerApiFetchOptions = {
  /** Next.js fetch cache options passed through to fetch(). */
  next?: { tags?: string[]; revalidate?: number | false };
  cache?: RequestCache;
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
  const url = resolveServerUrl(path);
  const headers = await buildServerHeaders(init);

  return fetch(url, {
    ...init,
    headers,
    ...(options.next !== undefined ? { next: options.next } : {}),
    ...(options.cache !== undefined ? { cache: options.cache } : {}),
  });
}

export async function serverApiJson<T>(
  path: string,
  init?: RequestInit,
  options: ServerApiFetchOptions = {},
): Promise<T> {
  const response = await serverApiFetch(path, init, options);
  return parseApiJsonResponse<T>(response);
}

export async function serverApiJsonOrNull<T>(
  path: string,
  init?: RequestInit,
  options: ServerApiFetchOptions = {},
): Promise<T | null> {
  try {
    const response = await serverApiFetch(path, init, options);
    return parseApiJsonResponseOrNull<T>(response);
  } catch {
    return null;
  }
}
