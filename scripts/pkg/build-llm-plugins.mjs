#!/usr/bin/env node
// biome-ignore-all lint/style/noExcessiveLinesPerFile: one CLI owns render, check, write, and zip
/**
 * Build Claude and OpenAI plugin trees from `llm-plugins/src`.
 * The config has no version. Pass `--check` or `--zip` on the CLI.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const CONNECT_BLOCK = /<!-- llm-plugin-connect -->[\s\S]*?<!-- \/llm-plugin-connect -->/;
const ZIP_SCRIPT = [
  "import pathlib, sys, zipfile",
  "root = pathlib.Path('.')",
  "destination = pathlib.Path(sys.argv[1])",
  "with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:",
  "    paths = sorted(path for path in root.rglob('*') if path.is_file())",
  "    for path in paths:",
  "        archive.write(path, path.as_posix())",
].join("\n");

function stringifyJson(value) {
  const pretty = JSON.stringify(value, null, 2).replace(
    /^( *)("[^"]+": )\[\n((?: *"(?:\\.|[^"\\])*",?\n)+) *\]/gm,
    (match, indent, key, body) => {
      const items = [...body.matchAll(/"(?:\\.|[^"\\])*"/g)].map((item) => item[0]);
      const inline = `${indent}${key}[${items.join(", ")}]`;
      return inline.length <= 100 ? inline : match;
    },
  );
  return `${pretty}\n`;
}

function object(entries) {
  const out = {};
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Replace the connect block, markers included, with `replacement`. */
export function applyConnectBlock(source, replacement) {
  if (typeof source !== "string") {
    throw new Error("Connect source must be a string.");
  }
  if (typeof replacement !== "string" || replacement.length === 0) {
    throw new Error("Connect text is empty.");
  }
  if (replacement.includes("llm-plugin-connect")) {
    throw new Error("Connect text must not contain a marker.");
  }
  const openings = source.match(/<!-- llm-plugin-connect -->/g);
  if (openings?.length !== 1 || !CONNECT_BLOCK.test(source)) {
    throw new Error("Connect block is missing.");
  }
  const next = source.replace(CONNECT_BLOCK, () => replacement);
  if (next.includes("llm-plugin-connect")) {
    throw new Error("Connect markers remain after replacement.");
  }
  return next;
}

function requireString(value, label, max) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  if (max !== undefined && value.length > max) {
    throw new Error(`${label} is ${value.length} characters. The limit is ${max}.`);
  }
}

function requireList(items, label, maxItems, maxLength) {
  if (!Array.isArray(items) || items.length === 0 || items.length > maxItems) {
    throw new Error(`${label} must hold 1 to ${maxItems} items.`);
  }
  for (const item of items) {
    requireString(item, label, maxLength);
  }
}

function validateConfig(config) {
  if (!config || typeof config !== "object" || Object.hasOwn(config, "version")) {
    throw new Error("plugin.config.json must not set version.");
  }
  const claude = config.hosts?.claude;
  const openai = config.hosts?.openai;
  if (claude?.mcpType !== "http" || openai?.mcpType !== "streamable-http") {
    throw new Error("MCP types must be http and streamable-http.");
  }
  requireString(openai?.shortDescription, "shortDescription", 30);
  requireString(openai?.longDescription, "longDescription", 4000);
  requireString(openai?.review?.commerce_description, "commerce_description");
  requireList(openai?.capabilities, "capabilities", 20, 120);
  if (/\b(price|pricing|trial|checkout)\b/i.test(openai.longDescription)) {
    throw new Error("longDescription must not mention price, trial, or checkout.");
  }
  if (!Array.isArray(openai.defaultPrompt) || openai.defaultPrompt.length !== 3) {
    throw new Error("defaultPrompt must hold 3 strings.");
  }
  for (const prompt of openai.defaultPrompt) {
    requireString(prompt, "defaultPrompt", 128);
    if (prompt.includes("@")) {
      throw new Error("defaultPrompt must not contain an @mention.");
    }
  }
  const client = openai.auth?.client ?? {};
  const secret = "clientId" in client || "clientSecret" in client || "clientSecret" in openai.auth;
  if (openai.auth?.type !== "oauth" || client.mode !== "cimd" || secret) {
    throw new Error("OpenAI auth must be oauth / cimd with no client id or secret.");
  }
  const banned = JSON.stringify(openai).includes("Claude") || openai.publication !== undefined;
  const extraField = openai.review?.demo_recording_url !== undefined;
  if (banned || extraField || openai.review?.commerce !== false) {
    throw new Error("Omit Claude, publication, demo_recording_url, and commerce sales.");
  }
  const positive = openai.review?.test_cases?.positive;
  const negative = openai.review?.test_cases?.negative;
  const caseCount = !Array.isArray(positive) || positive.length !== 5;
  if (caseCount || !Array.isArray(negative) || negative.length !== 3) {
    throw new Error("Review needs 5 positive cases and 3 negative cases.");
  }
  for (const item of positive) {
    for (const key of ["description", "prompt", "tools_triggered", "expected_behavior"]) {
      requireString(item?.[key], `positive.${key}`);
    }
  }
  for (const item of negative) {
    requireString(item?.description, "negative.description");
    requireString(item?.prompt, "negative.prompt");
  }
}

function requireVersion(version) {
  if (typeof version !== "string" || version.trim() === "") {
    throw new Error("Version is missing.");
  }
}

function author(config) {
  return object([
    ["name", config.author.name],
    ["url", config.author.url],
  ]);
}

function claudeManifest(config, version) {
  const { links } = config;
  return object([
    ["author", author(config)],
    ["description", config.description],
    ["displayName", config.displayName],
    ["documentationUrl", links.documentation],
    ["homepage", links.homepage],
    ["icon", "./assets/icon.png"],
    ["keywords", config.keywords],
    ["license", config.license],
    ["name", config.name],
    ["privacyPolicyUrl", links.privacy],
    ["repository", config.repository],
    ["supportUrl", links.support],
    ["termsOfServiceUrl", links.terms],
    ["version", version],
  ]);
}

function mcpServer(config, type, extra) {
  return object([["type", type], ["url", config.mcp.url], ...extra]);
}

function claudeMcp(config) {
  const server = mcpServer(config, config.hosts.claude.mcpType, []);
  return object([["mcpServers", object([[config.mcp.serverName, server]])]]);
}

function caseFields(item, keys) {
  return object(keys.map((key) => [key, item[key]]));
}

function openAiManifest(config, version) {
  const host = config.hosts.openai;
  const { links } = config;
  const interfaceFields = object([
    ["displayName", config.displayName],
    ["shortDescription", host.shortDescription],
    ["longDescription", host.longDescription],
    ["developerName", host.developerName],
    ["category", host.category],
    ["capabilities", host.capabilities],
    ["websiteURL", links.homepage],
    ["supportURL", links.support],
    ["privacyPolicyURL", links.privacy],
    ["termsOfServiceURL", links.terms],
    ["defaultPrompt", host.defaultPrompt],
    ["composerIcon", "./assets/icon.png"],
    ["logo", "./assets/icon.png"],
  ]);
  const review = object([
    [
      "test_cases",
      object([
        [
          "positive",
          host.review.test_cases.positive.map((item) =>
            caseFields(item, ["description", "prompt", "tools_triggered", "expected_behavior"]),
          ),
        ],
        [
          "negative",
          host.review.test_cases.negative.map((item) =>
            caseFields(item, ["description", "prompt"]),
          ),
        ],
      ]),
    ],
    ["commerce", host.review.commerce],
    ["commerce_description", host.review.commerce_description],
  ]);
  const extension = object([
    ["interface", interfaceFields],
    ["review", review],
  ]);
  return object([
    ["$schema", PLUGIN_SCHEMA],
    ["name", config.name],
    ["version", version],
    ["description", config.description],
    ["author", author(config)],
    ["homepage", links.homepage],
    ["repository", config.repository],
    ["license", config.license],
    ["keywords", config.keywords],
    ["extensions", object([["com.openai", extension]])],
  ]);
}

function openAiMcp(config) {
  const auth = object([
    ["type", config.hosts.openai.auth.type],
    ["client", object([["mode", config.hosts.openai.auth.client.mode]])],
  ]);
  const extensions = object([["com.openai", object([["auth", auth]])]]);
  const server = mcpServer(config, config.hosts.openai.mcpType, [["extensions", extensions]]);
  return object([
    ["$schema", MCP_SCHEMA],
    ["mcpServers", object([[config.mcp.serverName, server]])],
  ]);
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === "string") {
    return Buffer.from(value, "utf8");
  }
  throw new Error("Plugin file body must be a string or a Buffer.");
}

function textFile(files, rel) {
  const body = files.get(rel);
  if (typeof body !== "string") {
    throw new Error(`Missing text file ${rel}.`);
  }
  return body;
}

function skillBodies(files) {
  return [...files.entries()]
    .filter(
      ([rel, body]) =>
        rel.startsWith("skills/") && rel.endsWith("/SKILL.md") && typeof body === "string",
    )
    .sort(([left], [right]) => left.localeCompare(right));
}

function assertCleanTree(tree, label) {
  for (const [rel, body] of tree) {
    if (rel.endsWith(".png")) {
      continue;
    }
    const text = body.toString("utf8");
    if (text.includes("llm-plugin-connect")) {
      throw new Error(`${label}/${rel} still contains a connect marker.`);
    }
    if (label === "openai" && text.includes("Claude")) {
      throw new Error(`${label}/${rel} contains "Claude".`);
    }
  }
}

function renderHost(label, config, files, version, manifestRel, manifest, mcpRel, mcp) {
  validateConfig(config);
  requireVersion(version);
  const host = config.hosts[label];
  const tree = new Map();
  tree.set(manifestRel, toBuffer(stringifyJson(manifest)));
  tree.set(mcpRel, toBuffer(stringifyJson(mcp)));
  tree.set(
    "README.md",
    toBuffer(applyConnectBlock(textFile(files, "readme.md"), host.readmeConnect)),
  );
  tree.set("LICENSE", toBuffer(files.get("LICENSE")));
  tree.set("assets/icon.png", toBuffer(files.get("assets/icon.png")));
  for (const [rel, body] of skillBodies(files)) {
    tree.set(rel, toBuffer(applyConnectBlock(body, host.skillConnect)));
  }
  assertCleanTree(tree, label);
  return tree;
}

export function renderClaudeTree(config, files, version) {
  return renderHost(
    "claude",
    config,
    files,
    version,
    ".claude-plugin/plugin.json",
    claudeManifest(config, version),
    ".mcp.json",
    claudeMcp(config),
  );
}

export function renderOpenAiTree(config, files, version) {
  return renderHost(
    "openai",
    config,
    files,
    version,
    "plugin.json",
    openAiManifest(config, version),
    "mcp.json",
    openAiMcp(config),
  );
}

export function loadPluginSource(root) {
  const src = join(root, "llm-plugins/src");
  const config = JSON.parse(readFileSync(join(src, "plugin.config.json"), "utf8"));
  const files = new Map();
  files.set("readme.md", readFileSync(join(src, "readme.md"), "utf8"));
  files.set("LICENSE", readFileSync(join(src, "LICENSE")));
  files.set("assets/icon.png", readFileSync(join(src, "assets/icon.png")));
  for (const name of readdirSync(join(src, "skills"))) {
    const skillDir = join(src, "skills", name);
    if (!lstatSync(skillDir).isDirectory()) {
      continue;
    }
    files.set(`skills/${name}/SKILL.md`, readFileSync(join(skillDir, "SKILL.md"), "utf8"));
  }
  return { config, files };
}

function readRootVersion(root) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = typeof pkg.version === "string" ? pkg.version.trim() : "";
  if (!version) {
    throw new Error("Root package.json version is missing.");
  }
  return version;
}

function resolveInside(dir, rel) {
  const segments = rel.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Refusing to write outside the plugin folder: ${rel}`);
  }
  return resolve(dir, rel);
}

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const abs = join(current, entry);
      const info = lstatSync(abs);
      if (info.isDirectory() && !info.isSymbolicLink()) {
        walk(abs);
        continue;
      }
      out.push(relative(dir, abs).split(sep).join("/"));
    }
  };
  walk(dir);
  return out.sort();
}

function diffTree(dir, files) {
  const diffs = [];
  const actual = new Set(listFiles(dir));
  for (const rel of actual) {
    if (!files.has(rel)) {
      diffs.push(`unexpected file ${rel}`);
    }
  }
  for (const [rel, body] of files) {
    if (!actual.has(rel)) {
      diffs.push(`missing file ${rel}`);
      continue;
    }
    if (!readFileSync(join(dir, rel)).equals(body)) {
      diffs.push(`content differs ${rel}`);
    }
  }
  return diffs;
}

function removeEmptyDirs(dir) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (!lstatSync(abs).isDirectory()) {
      continue;
    }
    removeEmptyDirs(abs);
    if (readdirSync(abs).length === 0) {
      rmdirSync(abs);
    }
  }
}

function writeTree(dir, files) {
  mkdirSync(dir, { recursive: true });
  for (const [rel, body] of files) {
    const abs = resolveInside(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  for (const rel of listFiles(dir)) {
    if (!files.has(rel)) {
      rmSync(resolveInside(dir, rel), { force: true });
    }
  }
  removeEmptyDirs(dir);
}

function writeZip(root, files) {
  const dir = mkdtempSync(join(tmpdir(), "bondery-openai-plugin-"));
  try {
    writeTree(dir, files);
    const zipPath = join(root, "tmp/bondery-openai-plugin.zip");
    mkdirSync(dirname(zipPath), { recursive: true });
    rmSync(zipPath, { force: true });
    execFileSync("python3", ["-c", ZIP_SCRIPT, zipPath], { cwd: dir });
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

function parseArgs(args) {
  const options = { check: false, zip: false };
  for (const arg of args) {
    if (arg === "--check") {
      options.check = true;
    } else if (arg === "--zip") {
      options.zip = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

function run(options) {
  const root = repoRoot();
  const version = readRootVersion(root);
  const { config, files } = loadPluginSource(root);
  const claude = renderClaudeTree(config, files, version);
  const openai = renderOpenAiTree(config, files, version);
  if (options.check) {
    const diffs = [
      ...diffTree(join(root, "llm-plugins/claude"), claude).map(
        (item) => `llm-plugins/claude: ${item}`,
      ),
      ...diffTree(join(root, "llm-plugins/openai"), openai).map(
        (item) => `llm-plugins/openai: ${item}`,
      ),
    ];
    if (diffs.length > 0) {
      console.error(
        "Plugin trees differ from the build output. Run node scripts/pkg/build-llm-plugins.mjs",
      );
      for (const diff of diffs) {
        console.error(`  - ${diff}`);
      }
      process.exit(1);
    }
    console.log(`Plugin trees match version ${version}.`);
  } else {
    writeTree(join(root, "llm-plugins/claude"), claude);
    writeTree(join(root, "llm-plugins/openai"), openai);
    console.log(`Wrote plugin trees at version ${version}.`);
  }
  if (options.zip) {
    writeZip(root, openai);
    console.log("Wrote tmp/bondery-openai-plugin.zip.");
  }
}

function main() {
  try {
    run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main();
}
