import type { McpConsentListItem } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import { MCP_CONSENTS_API_PATH, parseMcpConsentsList } from "@/lib/api/resources/mcpConsents";

export async function getMcpConsents(): Promise<McpConsentListItem[]> {
  const raw = await clientApiJson<{ consents?: McpConsentListItem[] }>(MCP_CONSENTS_API_PATH);
  return parseMcpConsentsList(raw);
}

export async function revokeMcpConsent(id: string): Promise<void> {
  await clientApiJson(`${MCP_CONSENTS_API_PATH}/${id}`, {
    method: "DELETE",
  });
}
