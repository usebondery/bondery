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
  path.join(repoRoot, "apps/website/src"),
];

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
  /const\s+(\w+)\s*=\s*useWebTranslations\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/g,
  /const\s+(\w+)\s*=\s*useMobileTranslations\(\s*(?:["']([^"']*)["'])?(?:\s*,\s*["']([^"']+)["'])?/g,
  /const\s+(\w+)\s*=\s*useCommonTranslations\(\s*(?:["']([^"']+)["'])?\s*\)/g,
  /const\s+(\w+)\s*=\s*await\s+get(?:Web)?Translations(?:\s+as\s+\w+)?\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/g,
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
  for (const re of hookBindingRes) {
    for (const match of content.matchAll(re)) {
      const [, varName, nsOrPrefix, maybePrefix] = match;
      if (re.source.includes("useCommonTranslations")) {
        bindings.set(varName, { ns: "common", prefix: nsOrPrefix ?? "" });
      } else if (re.source.includes("useMobileTranslations")) {
        bindings.set(varName, { ns: nsOrPrefix || "common", prefix: maybePrefix ?? "" });
      } else {
        bindings.set(varName, { ns: nsOrPrefix, prefix: maybePrefix ?? "" });
      }
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

const mirrorResult = spawnSync("node", [path.join(packageRoot, "scripts/sync-locale-mirror.mjs")], {
  cwd: repoRoot,
  shell: true,
  stdio: "inherit",
});
if (mirrorResult.status !== 0) {
  process.exit(mirrorResult.status ?? 1);
}

const statusResult = spawnSync(
  "npx",
  ["i18next-cli", "status", "-c", "packages/translations/i18next.config.ts"],
  { cwd: repoRoot, shell: true, stdio: "inherit" },
);

if (statusResult.status !== 0) {
  console.error("FAIL: i18next-cli status reported incomplete translations");
  process.exit(1);
}

if (failed) {
  process.exit(1);
}

console.log(`Hook extraction parity check passed (${discovered.size} keys discovered).`);
