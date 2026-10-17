import {
  buildMcpInspectorOAuthClientMetadataDocument,
  MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL,
} from "@bondery/helpers/dev/mcp-inspector-client-metadata";

/** CIMD for local MCP Inspector against a dev API (`pnpm run mcp:inspect`). */
export function GET() {
  const body = JSON.stringify(
    buildMcpInspectorOAuthClientMetadataDocument(MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL),
  );
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
