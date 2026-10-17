/**
 * Pinned MCP Inspector web backend ports (defaults from Inspector configuration docs).
 * @see https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/configuration
 */
export const MCP_INSPECTOR_CLIENT_PORT = 6274;
export const MCP_INSPECTOR_SANDBOX_PORT = 6275;
export const MCP_INSPECTOR_APP_ORIGIN_PORT = 6278;

export const MCP_INSPECTOR_WEB_PORTS = [
  MCP_INSPECTOR_CLIENT_PORT,
  MCP_INSPECTOR_SANDBOX_PORT,
  MCP_INSPECTOR_APP_ORIGIN_PORT,
];

/** Env for `mcp-inspector --web` so UI, sandbox, and app origin stay on fixed ports. */
export function mcpInspectorWebProcessEnv() {
  return {
    ...process.env,
    CLIENT_PORT: String(MCP_INSPECTOR_CLIENT_PORT),
    MCP_APP_ORIGIN_PORT: String(MCP_INSPECTOR_APP_ORIGIN_PORT),
    MCP_SANDBOX_PORT: String(MCP_INSPECTOR_SANDBOX_PORT),
  };
}
