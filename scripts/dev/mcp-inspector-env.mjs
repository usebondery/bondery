import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEV_URLS } from "@bondery/schemas/constants/dev-ports";

/**
 * Pinned MCP Inspector web backend ports (defaults from Inspector configuration docs).
 * @see https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/configuration
 */
export const MCP_INSPECTOR_CLIENT_PORT = 6274;
export const MCP_INSPECTOR_SANDBOX_PORT = 6275;
export const MCP_INSPECTOR_APP_ORIGIN_PORT = 6278;

/** Local API MCP endpoint via Portless (matches `DEV_URLS.api`). */
export const MCP_INSPECTOR_API_URL = `${DEV_URLS.api}/mcp`;

export const MCP_INSPECTOR_WEB_PORTS = [
  MCP_INSPECTOR_CLIENT_PORT,
  MCP_INSPECTOR_SANDBOX_PORT,
  MCP_INSPECTOR_APP_ORIGIN_PORT,
];

function portlessCaCertPath() {
  return join(homedir(), ".portless", "ca.pem");
}

/** Env for `mcp-inspector --web` so UI, sandbox, and app origin stay on fixed ports. */
export function mcpInspectorWebProcessEnv() {
  const env = {
    ...process.env,
    CLIENT_PORT: String(MCP_INSPECTOR_CLIENT_PORT),
    MCP_APP_ORIGIN_PORT: String(MCP_INSPECTOR_APP_ORIGIN_PORT),
    MCP_SANDBOX_PORT: String(MCP_INSPECTOR_SANDBOX_PORT),
  };

  const ca = portlessCaCertPath();
  if (existsSync(ca) && !env.NODE_EXTRA_CA_CERTS) {
    env.NODE_EXTRA_CA_CERTS = ca;
  }

  return env;
}
