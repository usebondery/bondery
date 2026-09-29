import "server-only";

import type { McpConsentListItem } from "@bondery/schemas";
import { MCP_CONSENTS_API_PATH, parseMcpConsentsList } from "@/lib/api/resources/mcpConsents";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const DEFAULT_OPTIONS: ServerApiFetchOptions = {
  cache: "no-store",
};

export async function getMcpConsentsServer(
  options: ReadOptions = {},
): Promise<McpConsentListItem[]> {
  const raw = await serverApiJson<{ consents?: McpConsentListItem[] }>(
    MCP_CONSENTS_API_PATH,
    undefined,
    {
      ...DEFAULT_OPTIONS,
      ...options,
    },
  );
  return parseMcpConsentsList(raw);
}
