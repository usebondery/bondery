#!/usr/bin/env node
/**
 * Moves types/schema/contract/barrel flat files into per-module subfolders.
 * e.g. entities/contact.types.ts → entities/contact/types.ts
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const schemasSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** @type {Array<{ dir: string; modules: string[] }>} */
const GROUPS = [
  {
    dir: "entities",
    modules: [
      "_shared",
      "activity",
      "address",
      "api",
      "api-keys",
      "channels",
      "chat",
      "contact",
      "group",
      "import",
      "important-date",
      "merge",
      "notes",
      "reminder",
      "session",
      "settings",
      "social",
      "subscription",
      "tag",
    ],
  },
  { dir: "primitives", modules: ["channel", "color"] },
  { dir: "locale", modules: ["supported-locale"] },
  { dir: "errors", modules: ["api-error-response"] },
  { dir: ".", modules: ["contact-id"] },
  { dir: "sync", modules: ["ws", "pull", "push", "mutations", "conflict"] },
  { dir: "http", modules: ["http", "ids"] },
  { dir: "geocode", modules: ["geocode"] },
];

const ALL_MODULE_NAMES = new Set(GROUPS.flatMap((g) => g.modules));

function fileExists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function moveModule(baseDir, name) {
  const dir = join(schemasSrc, baseDir === "." ? "" : baseDir);
  const prefix = join(dir, name);
  const targetDir = join(dir, name);

  const mappings = [
    [`${prefix}.types.ts`, "types.ts"],
    [`${prefix}.schema.ts`, "schema.ts"],
    [`${prefix}.contract.ts`, "contract.ts"],
    [`${prefix}.ts`, "index.ts"],
  ];

  const toMove = mappings.filter(([src]) => fileExists(src));
  if (toMove.length === 0) {
    return;
  }

  mkdirSync(targetDir, { recursive: true });
  for (const [src, dest] of toMove) {
    renameSync(src, join(targetDir, dest));
  }

  console.log(`  ${baseDir === "." ? "" : `${baseDir}/`}${name}/`);
}

for (const { dir, modules } of GROUPS) {
  console.log(`Restructuring ${dir === "." ? "src root" : dir}:`);
  for (const name of modules) {
    moveModule(dir, name);
  }
}

// Remove geocode/schemas.ts barrel (replaced by geocode/index.ts + geocode/ subfolder)
const geocodeSchemas = join(schemasSrc, "geocode", "schemas.ts");
if (fileExists(geocodeSchemas)) {
  unlinkSync(geocodeSchemas);
}

function walkTsFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") {
        continue;
      }
      walkTsFiles(full, acc);
    } else if (entry.endsWith(".ts") && entry.endsWith(".mjs") === false) {
      acc.push(full);
    }
  }
  return acc;
}

function applyImportRewrites(content) {
  for (const { dir, modules } of GROUPS) {
    for (const name of modules) {
      const hashPrefix = dir === "." ? `#${name}` : `#${dir}/${name}`;

      content = content
        .replaceAll(`${hashPrefix}.types.js`, `${hashPrefix}/types.js`)
        .replaceAll(`${hashPrefix}.schema.js`, `${hashPrefix}/schema.js`)
        .replaceAll(`${hashPrefix}.contract.js`, `${hashPrefix}/contract.js`)
        .replaceAll(`${hashPrefix}.js`, `${hashPrefix}/index.js`);
    }
  }

  // Sibling relative imports: ./module.schema.js → ../module/schema.js
  for (const name of ALL_MODULE_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content
      .replace(
        new RegExp(`from "\\./${escaped}\\.schema\\.js"`, "g"),
        `from "../${name}/schema.js"`,
      )
      .replace(
        new RegExp(`from '\\./${escaped}\\.schema\\.js'`, "g"),
        `from '../${name}/schema.js'`,
      )
      .replace(new RegExp(`from "\\./${escaped}\\.types\\.js"`, "g"), `from "../${name}/types.js"`)
      .replace(new RegExp(`from '\\./${escaped}\\.types\\.js'`, "g"), `from '../${name}/types.js'`)
      .replace(
        new RegExp(`from "\\./${escaped}\\.contract\\.js"`, "g"),
        `from "../${name}/contract.js"`,
      )
      .replace(
        new RegExp(`from '\\./${escaped}\\.contract\\.js'`, "g"),
        `from '../${name}/contract.js'`,
      )
      .replace(new RegExp(`from "\\./${escaped}\\.js"`, "g"), `from "../${name}/index.js"`)
      .replace(new RegExp(`from '\\./${escaped}\\.js'`, "g"), `from '../${name}/index.js'`);
  }

  // Inside a module folder: ./module.types.js → ./types.js
  for (const name of ALL_MODULE_NAMES) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content
      .replace(new RegExp(`from "\\./${escaped}\\.types\\.js"`, "g"), 'from "./types.js"')
      .replace(new RegExp(`from '\\./${escaped}\\.types\\.js'`, "g"), "from './types.js'")
      .replace(new RegExp(`from "\\./${escaped}\\.schema\\.js"`, "g"), 'from "./schema.js"')
      .replace(new RegExp(`from '\\./${escaped}\\.schema\\.js'`, "g"), "from './schema.js'")
      .replace(new RegExp(`from "\\./${escaped}\\.contract\\.js"`, "g"), 'from "./contract.js"')
      .replace(new RegExp(`from '\\./${escaped}\\.contract\\.js'`, "g"), "from './contract.js'");
  }

  // Fix accidental double replacements
  content = content
    .replaceAll("/index/index.js", "/index.js")
    .replaceAll("/types/types.js", "/types.js")
    .replaceAll("/schema/schema.js", "/schema.js")
    .replaceAll("/contract/contract.js", "/contract.js");

  return content;
}

const repoRoot = join(schemasSrc, "../..");
const rootsToFix = [
  schemasSrc,
  join(repoRoot, "apps"),
  join(repoRoot, "packages"),
  join(repoRoot, "scripts"),
];

let filesUpdated = 0;
for (const root of rootsToFix) {
  if (!fileExists(root)) {
    continue;
  }
  for (const file of walkTsFiles(root)) {
    if (file.endsWith(".mjs")) {
      continue;
    }
    const original = readFileSync(file, "utf8");
    const content = applyImportRewrites(original);
    if (content !== original) {
      writeFileSync(file, content);
      filesUpdated++;
    }
  }
}

console.log(`\nUpdated ${filesUpdated} files with new import paths.`);
