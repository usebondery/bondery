import { spawn } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { killDevPort } from "./kill-dev-port.mjs";
import {
  ensureInspectorClientMetadataConfig,
  resolveMcpInspectorClientMetadataUrl,
} from "./mcp-inspector-cimd-url.mjs";
import { MCP_INSPECTOR_WEB_PORTS, mcpInspectorWebProcessEnv } from "./mcp-inspector-env.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = join(root, "scripts/dev/mcp-inspector.json");
const catalogPath = join(root, "scripts/dev/mcp-inspector.local.json");

/**
 * Inspector `--config` is read-only (cannot save Tools pagination). `--catalog`
 * is writable. Seed a gitignored copy so Inspector settings do not dirty git.
 */
function ensureWritableCatalog() {
  if (!existsSync(catalogPath)) {
    copyFileSync(seedPath, catalogPath);
    return;
  }

  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const seedServers = seed.mcpServers ?? {};
  catalog.mcpServers ??= {};
  let dirty = false;

  for (const [name, seedServer] of Object.entries(seedServers)) {
    const existing = catalog.mcpServers[name];
    if (!existing) {
      catalog.mcpServers[name] = seedServer;
      dirty = true;
      continue;
    }
    if (existing.protocolEra !== "modern") {
      existing.protocolEra = "modern";
      dirty = true;
    }
  }

  if (dirty) {
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  }
}

function freeMcpInspectorPorts() {
  let ok = true;
  for (const port of MCP_INSPECTOR_WEB_PORTS) {
    if (!killDevPort(port)) {
      ok = false;
    }
  }
  if (!ok) {
    console.error(
      `Could not free MCP Inspector ports (${MCP_INSPECTOR_WEB_PORTS.join(", ")}). Stop the other process manually.`,
    );
    process.exit(1);
  }
}

ensureWritableCatalog();
freeMcpInspectorPorts();

const userArgs = process.argv.slice(2);
const clientMetadataUrl = await resolveMcpInspectorClientMetadataUrl();
ensureInspectorClientMetadataConfig(clientMetadataUrl);
console.info(`MCP Inspector CIMD: ${clientMetadataUrl}`);

const child = spawn(
  "npx",
  ["--yes", "@modelcontextprotocol/inspector", "--web", "--catalog", catalogPath, ...userArgs],
  {
    cwd: root,
    env: mcpInspectorWebProcessEnv(),
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
