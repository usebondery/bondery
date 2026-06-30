import "server-only";

import { serverApiJson, type ServerApiFetchOptions } from "@/lib/api/server";

/**
 * Typed JSON fetch for RSC prefetch (server → API with auth headers).
 */
export function createServerFetcher() {
  return async function fetchJson<T>(
    path: string,
    init?: RequestInit,
    serverOpts?: ServerApiFetchOptions,
  ): Promise<T> {
    return serverApiJson<T>(path, init, serverOpts ?? {});
  };
}
