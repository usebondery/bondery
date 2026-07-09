import { buildNestedErrorResponse } from "@/lib/api/buildNestedErrorResponse";
import { type ServerApiFetchOptions, serverApiFetch } from "@/lib/api/server";

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
    return buildNestedErrorResponse({
      code: "service_unavailable",
      message: "Service unavailable",
      status: 503,
    });
  }
}
