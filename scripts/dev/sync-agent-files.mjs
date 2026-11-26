/**
 * Mirror agent definitions, settings, skills, and MCP config from `.agents/` into each coding
 * tool's paths.
 *
 * `.agents/` is the one place to edit. Each tool only reads its own folder or file:
 *
 *   .agents/agents/*.md   -> .claude/agents/  (Claude Code, also inside Orca)
 *                         -> .cursor/agents/  (Cursor)
 *   .agents/settings.json -> .claude/settings.json (Claude Code project settings)
 *   .agents/skills/<name> -> .claude/skills/  (Claude Code; Codex and Cursor read .agents/skills)
 *   .agents/mcp/mcp.json  -> .mcp.json        (Claude Code project MCP)
 *                         -> .cursor/mcp.json (Cursor project MCP)
 *
 * Mirrors are committed so a fresh clone works in every tool without a setup step. Git stores
 * identical files once, so the copies cost almost nothing.
 *
 * Usage:
 *   node scripts/dev/sync-agent-files.mjs           # write the mirrors
 *   node scripts/dev/sync-agent-files.mjs --check   # fail when a mirror drifted (CI, check:changed)
 *   node scripts/dev/sync-agent-files.mjs --stage   # write, then `git add` the mirrors (pre-commit)
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

const SETTINGS_SOURCE = ".agents/settings.json";
const SETTINGS_TARGET = ".claude/settings.json";
const MCP_SOURCE = ".agents/mcp/mcp.json";
const MCP_TARGETS = [
  { format: "claude", path: ".mcp.json" },
  { format: "cursor", path: ".cursor/mcp.json" },
];

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function relativeFiles(dir) {
  return listFiles(dir)
    .map((file) => relative(dir, file).split(sep).join("/"))
    .sort((a, b) => a.localeCompare(b));
}

/** Each source folder and the folders that must mirror it exactly. */
const MIRRORS = [
  { source: ".agents/agents", targets: [".claude/agents", ".cursor/agents"] },
  { source: ".agents/skills", targets: [".claude/skills"] },
];

/** Paths that differ between a source folder and one mirror, relative to the repo root. */
function findDrift(sourceDir, targetDir) {
  const source = relativeFiles(sourceDir);
  const target = relativeFiles(targetDir);
  const drift = [];
  for (const file of source) {
    const mirrored = join(targetDir, file);
    if (!existsSync(mirrored)) {
      drift.push(`missing ${relative(ROOT, mirrored)}`);
    } else if (!readFileSync(join(sourceDir, file)).equals(readFileSync(mirrored))) {
      drift.push(`changed ${relative(ROOT, mirrored)}`);
    }
  }
  const sourceSet = new Set(source);
  for (const file of target) {
    if (!sourceSet.has(file)) {
      drift.push(
        `extra ${relative(ROOT, join(targetDir, file))} (delete it or add it to ${relative(ROOT, sourceDir)})`,
      );
    }
  }
  return drift.map((line) => line.split(sep).join("/"));
}

function writeMirror(sourceDir, targetDir) {
  rmSync(targetDir, { force: true, recursive: true });
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

function readMcpSource() {
  const sourcePath = join(ROOT, MCP_SOURCE);
  if (!existsSync(sourcePath)) {
    throw new Error(`missing ${MCP_SOURCE}`);
  }
  const parsed = parseYaml(readFileSync(sourcePath, "utf8"));
  if (typeof parsed !== "object" || parsed === null || !("mcpServers" in parsed)) {
    throw new Error(`${MCP_SOURCE} must contain mcpServers`);
  }
  return parsed;
}

/** @param {Record<string, unknown>} config */
function prepareClaudeMcp(config) {
  const out = structuredClone(config);
  for (const server of Object.values(out.mcpServers ?? {})) {
    if (typeof server !== "object" || server === null) {
      continue;
    }
    if ("url" in server && !("command" in server) && !("type" in server)) {
      server.type = "http";
    }
    if ("command" in server && !("url" in server) && !("type" in server)) {
      server.type = "stdio";
    }
  }
  return out;
}

const PLANE_MCP_STDIO_ARG = "scripts/dev/plane-mcp-stdio.mjs";

/** @param {unknown} server */
function expandCursorStdioPaths(server) {
  if (typeof server !== "object" || server === null || !Array.isArray(server.args)) {
    return;
  }
  server.args = server.args.map((arg) =>
    arg === PLANE_MCP_STDIO_ARG ? `\${workspaceFolder}/${PLANE_MCP_STDIO_ARG}` : arg,
  );
}

/** Cursor rejects `type` on remote URL servers (Plane MCP docs). */
/** @param {Record<string, unknown>} config */
function prepareCursorMcp(config) {
  const out = structuredClone(config);
  for (const server of Object.values(out.mcpServers ?? {})) {
    if (typeof server !== "object" || server === null) {
      continue;
    }
    if ("url" in server && !("command" in server) && "type" in server) {
      delete server.type;
    }
    expandCursorStdioPaths(server);
  }
  return out;
}

function formatMcpJson(config) {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function renderMcpTarget(format) {
  const source = /** @type {Record<string, unknown>} */ (readMcpSource());
  const prepared = format === "claude" ? prepareClaudeMcp(source) : prepareCursorMcp(source);
  return formatMcpJson(prepared);
}

function findMcpDrift() {
  const drift = [];
  for (const { path: targetPath, format } of MCP_TARGETS) {
    const full = join(ROOT, targetPath);
    const expected = renderMcpTarget(format);
    if (!existsSync(full)) {
      drift.push(`missing ${targetPath}`);
      continue;
    }
    const actual = readFileSync(full, "utf8");
    if (actual !== expected) {
      drift.push(`changed ${targetPath}`);
    }
  }
  return drift;
}

function findSettingsDrift(sourcePath, targetPath) {
  if (!existsSync(targetPath)) {
    return [`missing ${relative(ROOT, targetPath)}`];
  }
  if (!readFileSync(sourcePath).equals(readFileSync(targetPath))) {
    return [`changed ${relative(ROOT, targetPath)}`];
  }
  return [];
}

function writeSettingsMirror() {
  const sourcePath = join(ROOT, SETTINGS_SOURCE);
  const targetPath = join(ROOT, SETTINGS_TARGET);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(sourcePath));
}

function writeMcpMirrors() {
  for (const { path: targetPath, format } of MCP_TARGETS) {
    const full = join(ROOT, targetPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, renderMcpTarget(format));
  }
}

function main() {
  const check = process.argv.includes("--check");
  const stage = process.argv.includes("--stage");

  if (check) {
    const drift = MIRRORS.flatMap(({ source, targets }) =>
      targets.flatMap((target) => findDrift(join(ROOT, source), join(ROOT, target))),
    )
      .concat(findSettingsDrift(join(ROOT, SETTINGS_SOURCE), join(ROOT, SETTINGS_TARGET)))
      .concat(findMcpDrift());
    if (drift.length > 0) {
      console.error("check-agent-files: failed\n");
      for (const line of drift) {
        console.error(`  - ${line}`);
      }
      console.error("\nEdit files under .agents/, then run `pnpm run agents:sync`.");
      process.exitCode = 1;
      return;
    }
    console.log("check-agent-files: ok");
    return;
  }

  for (const { source, targets } of MIRRORS) {
    for (const target of targets) {
      writeMirror(join(ROOT, source), join(ROOT, target));
    }
  }
  writeSettingsMirror();
  writeMcpMirrors();
  if (stage) {
    const paths = [
      ...MIRRORS.flatMap(({ targets }) => targets),
      SETTINGS_TARGET,
      ...MCP_TARGETS.map(({ path }) => path),
    ];
    execFileSync("git", ["add", "--all", "--", ...paths], { cwd: ROOT, stdio: "inherit" });
  }
  console.log("agents:sync: mirrors written");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export {
  findDrift,
  findMcpDrift,
  findSettingsDrift,
  MCP_TARGETS,
  MIRRORS,
  prepareClaudeMcp,
  prepareCursorMcp,
};
