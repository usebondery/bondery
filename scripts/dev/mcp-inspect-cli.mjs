import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMcpInspectorClientMetadataUrl } from "./mcp-inspector-cimd-url.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const userArgs = process.argv.slice(2);
const clientMetadataUrl = await resolveMcpInspectorClientMetadataUrl();

console.info(`MCP Inspector CIMD: ${clientMetadataUrl}`);

const child = spawn(
  "npx",
  [
    "--yes",
    "@modelcontextprotocol/inspector",
    "--cli",
    "--transport",
    "http",
    "--server-url",
    "http://localhost:26631/mcp",
    "--protocol-era",
    "modern",
    "--client-metadata-url",
    clientMetadataUrl,
    "--use-stored-auth",
    ...userArgs,
  ],
  {
    cwd: root,
    shell: process.platform === "win32",
    stdio: "inherit",
    windowsHide: true,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
