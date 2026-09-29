import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { McpConsentListItem } from "@bondery/schemas";

export const MCP_CONSENTS_API_PATH = API_ROUTES.ME_MCP_CONSENTS;

export function parseMcpConsentsList(raw: {
  consents?: McpConsentListItem[];
}): McpConsentListItem[] {
  return raw.consents ?? [];
}
