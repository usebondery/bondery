import { WEBAPP_INTERNAL_API_URL_ENV, WEBAPP_RUNTIME_ENV } from "@/lib/platform/runtimeConfig.env";

/**
 * Normalize API base URL to origin-only format.
 * Prevents accidental `/api/api/...` requests when configured with a trailing `/api`.
 */
export function normalizeApiBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");
}

/**
 * Resolve the API base URL for server-side fetches (RSC / BFF).
 * Prefers BONDERY_INFRA_INTERNAL_API_URL (Compose DNS) when set; otherwise public URL.
 * Never use this value in browser-facing runtime config.
 */
export function resolveServerApiBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const internal = env[WEBAPP_INTERNAL_API_URL_ENV]?.trim();
  if (internal) {
    return normalizeApiBaseUrl(internal);
  }

  const publicUrl = env[WEBAPP_RUNTIME_ENV.apiUrl]?.trim();
  if (!publicUrl) {
    throw new Error(`Missing required environment variable: ${WEBAPP_RUNTIME_ENV.apiUrl}`);
  }

  return normalizeApiBaseUrl(publicUrl);
}

/** Join a path onto an API base URL (handles absolute URLs and /api prefix rules). */
export function joinApiUrl(apiBaseUrl: string, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return `${apiBaseUrl}${path}`;
  }

  if (path.startsWith("/")) {
    return `${apiBaseUrl}${path}`;
  }

  return `${apiBaseUrl}/api/${path}`;
}
