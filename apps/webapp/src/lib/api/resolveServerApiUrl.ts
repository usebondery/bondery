import { WEBAPP_INTERNAL_API_URL_ENV, WEBAPP_RUNTIME_ENV } from "@/lib/platform/runtimeConfig.env";

const TRAILING_SLASHES = /\/+$/u;
const API_PATH_SUFFIX = /\/api$/u;

/**
 * Normalize API base URL to origin-only format.
 * Prevents accidental `/api/api/...` requests when configured with a trailing `/api`.
 */
export function normalizeApiBaseUrl(rawUrl: string): string {
  return rawUrl.replace(TRAILING_SLASHES, "").replace(API_PATH_SUFFIX, "");
}

/** Dev-only: avoid IPv6 localhost resolution for server-side Node fetches. */
export function preferIpv4LoopbackForServerFetch(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString().replace(TRAILING_SLASHES, "");
    }
  } catch {
    return url;
  }

  return url;
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
    return preferIpv4LoopbackForServerFetch(normalizeApiBaseUrl(internal));
  }

  const publicUrl = env[WEBAPP_RUNTIME_ENV.apiUrl]?.trim();
  if (!publicUrl) {
    throw new Error(`Missing required environment variable: ${WEBAPP_RUNTIME_ENV.apiUrl}`);
  }

  return preferIpv4LoopbackForServerFetch(normalizeApiBaseUrl(publicUrl));
}

/**
 * Resolve the public API base URL (BONDERY_PUBLIC_API_URL).
 * Use for browser redirects, OAuth resource/issuer identifiers, and any value
 * that must match what the API advertises externally — never the Compose internal URL.
 */
export function resolvePublicApiBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
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
