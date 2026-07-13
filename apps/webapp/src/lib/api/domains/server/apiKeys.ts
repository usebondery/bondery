import "server-only";

import type { ApiKeyListItem } from "@bondery/schemas";
import { API_KEYS_API_PATH, parseApiKeysList } from "@/lib/api/resources/apiKeys";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const DEFAULT_OPTIONS: ServerApiFetchOptions = {
  cache: "no-store",
};

export async function getApiKeysServer(options: ReadOptions = {}): Promise<ApiKeyListItem[]> {
  const raw = await serverApiJson<{ apiKeys?: ApiKeyListItem[] }>(API_KEYS_API_PATH, undefined, {
    ...DEFAULT_OPTIONS,
    ...options,
  });
  return parseApiKeysList(raw);
}
