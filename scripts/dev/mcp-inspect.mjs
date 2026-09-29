import { spawn } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

ensureWritableCatalog();

const child = spawn(
  "npx",
  [
    "--yes",
    "@modelcontextprotocol/inspector",
    "--catalog",
    catalogPath,
    "--server",
    "bondery-local",
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    shell: true,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
