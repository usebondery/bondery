import { WEBSITE_ROUTES } from "../globals/paths.js";

/** Public HTTPS Client ID Metadata Document for MCP Inspector (CIMD). */
export const MCP_INSPECTOR_OAUTH_CLIENT_METADATA_PATH =
  WEBSITE_ROUTES.WELL_KNOWN_OAUTH_CLIENT_METADATA_INSPECTOR;

/** Canonical `client_id` URL — must match the hosted document location. */
export const MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL = `https://usebondery.com${MCP_INSPECTOR_OAUTH_CLIENT_METADATA_PATH}`;

/**
 * Inspector smoke-test CIMD (public HTTPS). Used when the Bondery document is not
 * deployed yet. See MCP Inspector `v2_auth_smoke_testing.md`.
 */
export const MCP_INSPECTOR_OAUTH_CLIENT_METADATA_FALLBACK_URL =
  "https://www.mcpjam.com/.well-known/oauth/client-metadata.json";

export type McpInspectorOAuthClientMetadataDocument = {
  application_type: "native";
  client_id: string;
  client_name: string;
  client_uri: string;
  grant_types: ["authorization_code", "refresh_token"];
  redirect_uris: string[];
  response_types: ["code"];
  token_endpoint_auth_method: "none";
};

/** Build the CIMD JSON served at {@link MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL}. */
export function buildMcpInspectorOAuthClientMetadataDocument(
  metadataDocumentUrl: string = MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL,
): McpInspectorOAuthClientMetadataDocument {
  const clientId = metadataDocumentUrl.replace(/\/+$/, "");
  return {
    application_type: "native",
    client_id: clientId,
    client_name: "MCP Inspector (Bondery)",
    client_uri: "https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector",
    grant_types: ["authorization_code", "refresh_token"],
    redirect_uris: [
      "http://127.0.0.1:6274/oauth/callback",
      "http://localhost:6274/oauth/callback",
      "http://127.0.0.1:6276/oauth/callback",
      "http://localhost:6276/oauth/callback",
    ],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
}
