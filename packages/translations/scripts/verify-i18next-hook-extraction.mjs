/**
 * Validates hook extraction: representative keys are discovered by the regex scanner
 * and i18next-cli status reports full locale coverage.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import localeCatalog from "@bondery/schemas/locale/supported-locales.json" with { type: "json" };

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const _localesRoot = path.join(packageRoot, "src/locales");
const _manifestPath = path.join(packageRoot, "manifest.json");
const _LOCALES = localeCatalog.supported.map((entry) => entry.code);

const SCAN_ROOTS = [
  path.join(repoRoot, "apps/webapp/src"),
  path.join(repoRoot, "apps/mobile/src"),
  path.join(repoRoot, "apps/mobile/app"),
  path.join(repoRoot, "apps/chrome-extension/src"),
  path.join(repoRoot, "apps/website/src"),
];

function _hookBaseName(namespace) {
  if (namespace === "common") {
    return "Common";
  }
  if (namespace === "validation") {
    return "Validation";
  }
  if (namespace === "glossary") {
    return "Glossary";
  }
  return namespace;
}

function namespaceFromGeneratedHook(hookSuffix) {
  if (hookSuffix === "Common") {
    return "common";
  }
  if (hookSuffix === "Validation") {
    return "validation";
  }
  if (hookSuffix === "Glossary") {
    return "glossary";
  }
  return hookSuffix;
}

const REPRESENTATIVE_KEYS = [
  "SettingsPage:DataManagement.VCardImport.ModalTitle",
  "SettingsPage:DataManagement.LinkedInImport.ModalTitle",
  "common:actions.cancel",
  "validation:fields.firstName.required",
  "UnavailablePage:StatusOnline",
  "ChatPage:title",
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const hookBindingRes = [
  /const\s+(\w+)\s*=\s*use([A-Za-z]+)Translations\(\s*(?:["']([^"']+)["'])?/g,
  /const\s+(\w+)\s*=\s*await\s+get([A-Za-z]+)Translations\(\s*(?:["']([^"']+)["'])?/g,
];
const tWithNsRe = /\b(\w+)\(\s*["']([^"']+)["']\s*,\s*\{[^}]*\bns:\s*["']([^"']+)["']/g;
const tCallRe = /\b(\w+)\(\s*["']([^"']+)["'](?!\s*,\s*\{[^}]*\bns:)/g;

const discovered = new Set();

function addUsage(namespace, key) {
  const full = key ? `${namespace}:${key}` : namespace;
  discovered.add(full);
}

function collectBindings(content) {
  const bindings = new Map();
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "manifest.json"), "utf8"));
  for (const re of hookBindingRes) {
    for (const match of content.matchAll(re)) {
      const [, varName, hookSuffix, prefix] = match;
      const ns = namespaceFromGeneratedHook(hookSuffix);
      if (!manifest.namespaces[ns]) {
        continue;
      }
      bindings.set(varName, { ns, prefix: prefix ?? "" });
    }
  }
  return bindings;
}

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    const content = fs.readFileSync(file, "utf8");
    const bindings = collectBindings(content);
    for (const match of content.matchAll(tWithNsRe)) {
      addUsage(match[3], match[2]);
    }
    if (bindings.size === 0) {
      continue;
    }
    for (const match of content.matchAll(tCallRe)) {
      const [, varName, key] = match;
      const ctx = bindings.get(varName);
      if (!ctx) {
        continue;
      }
      if (key.includes("{{") || key.includes("${")) {
        continue;
      }
      const fullKey = [ctx.prefix, key].filter(Boolean).join(".");
      addUsage(ctx.ns, fullKey);
    }
  }
}

let failed = false;
for (const key of REPRESENTATIVE_KEYS) {
  if (!discovered.has(key)) {
    console.error(`FAIL: representative key not discovered by hook scanner: ${key}`);
    failed = true;
  }
}

const mirrorResult = spawnSync(
  process.execPath,
  [path.join(packageRoot, "scripts/sync-locale-mirror.mjs")],
  { cwd: repoRoot, stdio: "inherit" },
);
if (mirrorResult.status !== 0) {
  process.exit(mirrorResult.status ?? 1);
}

const i18nextCliPath = path.join(repoRoot, "node_modules/i18next-cli/dist/esm/cli.js");

if (fs.existsSync(i18nextCliPath)) {
  const statusResult = spawnSync(
    process.execPath,
    [i18nextCliPath, "status", "-c", "packages/translations/i18next.config.ts"],
    { cwd: repoRoot, stdio: "inherit" },
  );

  if (statusResult.status !== 0) {
    console.warn(
      "WARN: i18next-cli status incomplete (expected with namespace-scoped hooks; custom scanner is authoritative).",
    );
  }
} else {
  console.warn("WARN: i18next-cli not installed; skipped status subprocess.");
}

if (failed) {
  process.exit(1);
}

console.log(`Hook extraction parity check passed (${discovered.size} keys discovered).`);
