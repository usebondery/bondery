import { clientApiJson } from "@/lib/api/client";

/**
 * Typed JSON fetch for client components (BFF / browser).
 */
export function createClientFetcher() {
  return async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    return clientApiJson<T>(path, init);
  };
}
