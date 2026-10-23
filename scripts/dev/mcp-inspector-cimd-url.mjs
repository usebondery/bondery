import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL } from "@bondery/helpers/dev/mcp-inspector-cimd";

/** Inspector 2.x web mode reads CIMD from ~/.mcp-inspector/storage/client.json. */
export function ensureInspectorClientMetadataConfig(clientMetadataUrl) {
  const dir = join(homedir(), ".mcp-inspector", "storage");
  mkdirSync(dir, { recursive: true });
  const configPath = join(dir, "client.json");

  let config = {};
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, "utf8"));
    } catch {
      config = {};
    }
  }

  config.cimd = {
    clientMetadataUrl,
    enabled: true,
  };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

/** Resolve CIMD URL for MCP Inspector (env override, else MCPJam smoke-test CIMD). */
export async function resolveMcpInspectorClientMetadataUrl() {
  const fromEnv = process.env.BONDERY_MCP_INSPECTOR_CIMD_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return MCP_INSPECTOR_OAUTH_CLIENT_METADATA_URL;
}
