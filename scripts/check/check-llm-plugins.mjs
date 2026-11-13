/**
 * Guard both plugin folders.
 *
 * Run the builder in `--check` mode first.
 * Then apply the bundle safety rules to `llm-plugins/claude` and `llm-plugins/openai`.
 *
 * Usage: node scripts/check/check-llm-plugins.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-llm-plugins");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const EXPECTED_MCP_URL = "https://api.usebondery.com/mcp";
const EXPECTED_LICENSE = "AGPL-3.0";
const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

/** Fields Anthropic's directory reads. Claude Code ignores them at load time. */
const CLAUDE_URL_FIELDS = [
  "documentationUrl",
  "supportUrl",
  "privacyPolicyUrl",
  "termsOfServiceUrl",
];
const OPENAI_URL_FIELDS = ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"];

const HOSTS = [
  {
    id: "claude",
    manifestRel: ".claude-plugin/plugin.json",
    mcpRel: ".mcp.json",
    mcpType: "http",
    rel: "llm-plugins/claude",
  },
  {
    id: "openai",
    manifestRel: "plugin.json",
    mcpRel: "mcp.json",
    mcpType: "streamable-http",
    rel: "llm-plugins/openai",
  },
];

/** Names that must not appear anywhere in the bundle. */
const FORBIDDEN_NAMES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "hooks",
  "bin",
  "scripts",
  "node_modules",
]);

const FORBIDDEN_ENV_FILE = /^\.env/;
const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/;
const OPENAI_FORBIDDEN = [".mcp.json", ".codex-plugin", ".app.json", "hooks"];

function pluginDir(host) {
  return join(ROOT, host.rel);
}

function repoPath(filePath) {
  return relative(ROOT, filePath).split(sep).join("/");
}

function readJson(filePath, label) {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    check.add(`${label} is missing.`);
    return null;
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check.add(`${label} is not valid JSON: ${message}`);
    return null;
  }
}

function readRootVersion() {
  const pkg = readJson(join(ROOT, "package.json"), "package.json");
  return typeof pkg?.version === "string" ? pkg.version.trim() : "";
}

/**
 * `realpath` follows the link. `resolve` does not.
 * @param {string} target
 * @param {string} dir
 */
function isInsidePlugin(target, dir) {
  const resolved = realpathSync(target);
  const rootReal = realpathSync(dir);
  const prefix = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`;
  return resolved === rootReal || resolved.startsWith(prefix);
}

function checkIdentity(manifest, label) {
  if (manifest.name !== "bondery") {
    check.add(`${label}: name must be "bondery" (got ${JSON.stringify(manifest.name)})`);
  }
  if (manifest.license !== EXPECTED_LICENSE) {
    check.add(
      `${label}: license must be "${EXPECTED_LICENSE}" (got ${JSON.stringify(manifest.license)})`,
    );
  }
  if (manifest.author?.name !== "Bondery" || manifest.author?.url !== "https://usebondery.com") {
    check.add(`${label}: author must be Bondery at https://usebondery.com`);
  }
  const rootVersion = readRootVersion();
  if (!rootVersion) {
    check.add("package.json: version is missing, so the plugin version cannot be checked.");
    return;
  }
  if (manifest.version !== rootVersion) {
    check.add(
      `${label}: version ${JSON.stringify(manifest.version)} does not match root ${rootVersion} (run node scripts/pkg/build-llm-plugins.mjs)`,
    );
  }
}

function checkBundleFile(label, field, value, dir) {
  if (typeof value !== "string" || !value.startsWith("./")) {
    check.add(
      `${label}: ${field} must be a "./" path inside the plugin (got ${JSON.stringify(value)})`,
    );
    return;
  }
  const abs = resolve(dir, value.slice(2));
  const prefix = `${resolve(dir)}${sep}`;
  if (!abs.startsWith(prefix)) {
    check.add(`${label}: ${field} leaves the plugin folder.`);
    return;
  }
  let info;
  try {
    info = lstatSync(abs);
  } catch {
    check.add(`${label}: ${field} ${value} does not exist in the bundle.`);
  }
  if (info && !info.isFile()) {
    check.add(`${label}: ${field} ${value} is not a regular file.`);
  }
}

function checkHttpsFields(label, record, fields) {
  for (const field of fields) {
    const value = record[field];
    if (value === undefined) {
      continue;
    }
    let parsed;
    try {
      parsed = new URL(String(value));
    } catch {
      check.add(`${label}: ${field} is not a URL (got ${JSON.stringify(value)})`);
      continue;
    }
    if (parsed.protocol !== "https:") {
      check.add(`${label}: ${field} must use https:// (got ${JSON.stringify(value)})`);
    }
  }
}

function checkManifest(host) {
  const label = `${host.rel}/${host.manifestRel}`;
  const manifest = readJson(join(pluginDir(host), host.manifestRel), label);
  if (!manifest) {
    return;
  }
  checkIdentity(manifest, label);
  if (host.id === "claude") {
    if (manifest.displayName !== "Bondery") {
      check.add(`${label}: displayName must be "Bondery"`);
    }
    if (manifest.icon !== undefined) {
      checkBundleFile(label, "icon", manifest.icon, pluginDir(host));
    }
    checkHttpsFields(label, manifest, CLAUDE_URL_FIELDS);
    return;
  }
  if (manifest.$schema !== PLUGIN_SCHEMA) {
    check.add(`${label}: $schema must be the Agent Plugins plugin schema.`);
  }
  const iface = manifest.extensions?.["com.openai"]?.interface ?? {};
  if (iface.displayName !== "Bondery") {
    check.add(`${label}: interface.displayName must be "Bondery"`);
  }
  const short = iface.shortDescription;
  if (typeof short !== "string" || short.length === 0 || short.length > 30) {
    const length = typeof short === "string" ? String(short.length) : "none";
    check.add(`${label}: shortDescription must be 30 characters or fewer (got ${length}).`);
  }
  checkHttpsFields(label, iface, OPENAI_URL_FIELDS);
  for (const field of ["composerIcon", "logo"]) {
    if (iface[field] !== undefined) {
      checkBundleFile(label, field, iface[field], pluginDir(host));
    }
  }
}

function checkLicense(host) {
  const licensePath = join(pluginDir(host), "LICENSE");
  let info;
  try {
    info = lstatSync(licensePath);
  } catch {
    check.add(
      `${host.rel}/LICENSE is missing. Installers receive only this folder, so the license text must live here.`,
    );
    return;
  }
  if (info.isSymbolicLink()) {
    check.add(`${host.rel}/LICENSE is a symlink. Use a regular file.`);
    return;
  }
  if (!info.isFile()) {
    check.add(`${host.rel}/LICENSE is not a regular file.`);
    return;
  }
  const source = readFileSync(licensePath, "utf8");
  if (!source.startsWith("GNU AFFERO GENERAL PUBLIC LICENSE")) {
    check.add(`${host.rel}/LICENSE does not hold the AGPL-3.0 text.`);
  }
}

function checkOpenAiAuth(label, server) {
  const auth = server.extensions?.["com.openai"]?.auth;
  const client = auth?.client ?? {};
  if (auth?.type !== "oauth" || client.mode !== "cimd") {
    check.add(`${label}: auth must be oauth with client mode "cimd".`);
  }
  if ("clientId" in client || "clientSecret" in client || (auth && "clientSecret" in auth)) {
    check.add(`${label}: auth must not set clientId or clientSecret.`);
  }
}

function checkMcpConfig(host) {
  const label = `${host.rel}/${host.mcpRel}`;
  const config = readJson(join(pluginDir(host), host.mcpRel), label);
  if (!config) {
    return;
  }
  if (host.id === "openai" && config.$schema !== MCP_SCHEMA) {
    check.add(`${label}: $schema must be the Agent Plugins MCP schema.`);
  }
  const servers = config.mcpServers;
  const names = servers && typeof servers === "object" ? Object.keys(servers) : [];
  if (names.length !== 1 || names[0] !== "bondery") {
    check.add(`${label} must declare exactly one server named "bondery".`);
    return;
  }
  const server = servers.bondery ?? {};
  if (server.type !== host.mcpType) {
    check.add(
      `${label}: server type must be "${host.mcpType}" (got ${JSON.stringify(server.type)})`,
    );
  }
  if (server.url !== EXPECTED_MCP_URL) {
    check.add(`${label}: url must be ${EXPECTED_MCP_URL} (got ${JSON.stringify(server.url)})`);
  }
  for (const key of ["command", "args", "env", "headers", "cwd"]) {
    if (key in server) {
      check.add(`${label}: server must not set "${key}".`);
    }
  }
  if (host.id === "openai") {
    checkOpenAiAuth(label, server);
  }
}

function checkOpenAiShape(host) {
  const dir = pluginDir(host);
  for (const name of OPENAI_FORBIDDEN) {
    if (existsSync(join(dir, name))) {
      check.add(`${host.rel}/${name} must not be in the OpenAI package.`);
    }
  }
}

function readFrontmatterField(source, field) {
  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return null;
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) {
    return null;
  }
  for (const line of lines.slice(1, end)) {
    const match = new RegExp(`^${field}\\s*:\\s*(.*)$`).exec(line);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

/**
 * A skill whose `name` does not match its folder, or that has no
 * `description`, is dropped by the client without an error. Fail here instead.
 */
function checkSkillFrontmatter(name, skillFile) {
  const source = readFileSync(skillFile, "utf8");
  const rel = repoPath(skillFile);
  const declaredName = readFrontmatterField(source, "name");
  const description = readFrontmatterField(source, "description");
  if (!declaredName) {
    check.add(`${rel}: frontmatter is missing "name".`);
  } else if (declaredName !== name) {
    check.add(`${rel}: name "${declaredName}" does not match folder "${name}".`);
  }
  if (!description) {
    check.add(`${rel}: frontmatter is missing "description".`);
  }
}

function walk(dir, pluginRoot, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = lstatSync(full);
    if (info.isSymbolicLink()) {
      if (!isInsidePlugin(full, pluginRoot)) {
        check.add(`${repoPath(full)} is a symlink that leaves the plugin folder.`);
      }
      acc.push(full);
      continue;
    }
    if (info.isDirectory()) {
      walk(full, pluginRoot, acc);
      continue;
    }
    acc.push(full);
  }
  return acc;
}

function isProse(base) {
  return base.endsWith(".md") || base.endsWith(".json") || base === "LICENSE";
}

function checkTree(host) {
  const dir = pluginDir(host);
  const skillsDir = join(dir, "skills");
  const skillDirs = new Set();
  let skillEntries = [];
  try {
    skillEntries = readdirSync(skillsDir);
  } catch {
    check.add(`${host.rel}/skills is missing.`);
  }
  for (const entry of skillEntries) {
    if (lstatSync(join(skillsDir, entry)).isDirectory()) {
      skillDirs.add(entry);
    }
  }
  if (skillEntries.length > 0 && skillDirs.size === 0) {
    check.add(`${host.rel}/skills holds no skill folders.`);
  }
  for (const name of skillDirs) {
    const skillFile = join(skillsDir, name, "SKILL.md");
    try {
      if (!lstatSync(skillFile).isFile()) {
        check.add(`${host.rel}/skills/${name}/SKILL.md is not a regular file.`);
        continue;
      }
    } catch {
      check.add(`${host.rel}/skills/${name} has no SKILL.md.`);
      continue;
    }
    checkSkillFrontmatter(name, skillFile);
  }

  for (const file of walk(dir, dir)) {
    const rel = repoPath(file);
    const segments = relative(dir, file).split(sep);
    const base = segments.at(-1) ?? "";
    for (const segment of segments) {
      if (FORBIDDEN_NAMES.has(segment)) {
        check.add(`${rel} must not be inside the plugin bundle (${segment}).`);
      }
      if (FORBIDDEN_ENV_FILE.test(segment)) {
        check.add(`${rel} is an env file and must not be inside the plugin bundle.`);
      }
    }
    if (base.endsWith(".pem") || base.endsWith(".key")) {
      check.add(`${rel} looks like a key file and must not be inside the plugin bundle.`);
    }
    if (/\.[cm]?[jt]s$/.test(base)) {
      check.add(`${rel} is a script. The plugin ships content only.`);
    }
    const source = readFileSync(file, "utf8");
    if (PRIVATE_KEY_BLOCK.test(source)) {
      check.add(`${rel} contains a private-key block.`);
    }
    if (BEARER_TOKEN.test(source)) {
      check.add(`${rel} contains a bearer token.`);
    }
    if (source.includes("../")) {
      for (const match of source.matchAll(/["'(]\.\.\/[^"')\s]*/g)) {
        check.add(`${rel} references a path outside the folder: ${match[0].slice(1)}`);
        break;
      }
    }
    if (isProse(base) && source.includes("llm-plugin-connect")) {
      check.add(`${rel} still contains a connect marker.`);
    }
    if (host.id === "openai" && isProse(base) && source.includes("Claude")) {
      check.add(`${rel} contains "Claude".`);
    }
  }
}

function runBuilderCheck() {
  const builder = join(ROOT, "scripts/pkg/build-llm-plugins.mjs");
  const result = spawnSync(process.execPath, [builder, "--check"], { cwd: ROOT, stdio: "inherit" });
  if (result.error) {
    check.add(result.error.message);
    check.ok();
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runBuilderCheck();
for (const host of HOSTS) {
  checkManifest(host);
  checkLicense(host);
  checkMcpConfig(host);
  if (host.id === "openai") {
    checkOpenAiShape(host);
  }
  try {
    checkTree(host);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check.add(`${host.rel} could not be read: ${message}`);
  }
}
check.ok();
