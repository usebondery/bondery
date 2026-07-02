import { serverApiFetch, type ServerApiFetchOptions } from "@/lib/api/server";

const SERVICE_UNAVAILABLE_BODY = JSON.stringify({
  error: "Service unavailable",
  code: "BFF_UPSTREAM_UNAVAILABLE",
});

/**
 * BFF-safe upstream fetch: never applies RSC transport redirects.
 * Returns synthetic 503 JSON when the upstream API is unreachable.
 */
export async function bffProxyFetch(
  path: string,
  init?: RequestInit,
  options: Omit<ServerApiFetchOptions, "transportPolicy"> = {},
): Promise<Response> {
  try {
    return await serverApiFetch(path, init, { ...options, transportPolicy: false });
  } catch {
    return new Response(SERVICE_UNAVAILABLE_BODY, {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
