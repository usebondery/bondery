/**
 * Translation status gate for CI: validates used keys (regex + manifest paths) and
 * secondary-locale coverage, then runs i18next-cli status against the flat mirror.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import localeCatalog from "@bondery/schemas/locale/supported-locales.json" with { type: "json" };

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const localesRoot = path.join(packageRoot, "src/locales");
const manifestPath = path.join(packageRoot, "manifest.json");
const LOCALES = localeCatalog.supported.map((entry) => entry.code);

const SCAN_ROOTS = [
  path.join(repoRoot, "apps/webapp/src"),
  path.join(repoRoot, "apps/mobile/src"),
  path.join(repoRoot, "apps/website/src"),
];

let failed = false;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

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

function collectKeys(value, prefix = "", acc = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        collectKeys(nested, next, acc);
      } else {
        acc.push(next);
      }
    }
  }
  return acc;
}

function get(obj, keyPath) {
  return keyPath.split(".").reduce((current, key) => current?.[key], obj);
}

function keyExists(resource, key) {
  if (!resource) {
    return false;
  }
  if (get(resource, key) !== undefined) {
    return true;
  }
  return (
    get(resource, `${key}_zero`) !== undefined ||
    get(resource, `${key}_one`) !== undefined ||
    get(resource, `${key}_two`) !== undefined ||
    get(resource, `${key}_few`) !== undefined ||
    get(resource, `${key}_many`) !== undefined ||
    get(resource, `${key}_other`) !== undefined
  );
}

function loadNamespaceJson(locale, relativePath) {
  const filePath = path.join(localesRoot, locale, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const namespaceResources = {};
for (const [name, entry] of Object.entries(manifest.namespaces)) {
  namespaceResources[name] = {};
  for (const locale of LOCALES) {
    namespaceResources[name][locale] = loadNamespaceJson(locale, entry.path);
  }
}

const hookBindingRes = [
  /const\s+(\w+)\s*=\s*useWebTranslations\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/g,
  /const\s+(\w+)\s*=\s*useMobileTranslations\(\s*(?:["']([^"']*)["'])?(?:\s*,\s*["']([^"']+)["'])?/g,
  /const\s+(\w+)\s*=\s*useCommonTranslations\(\s*(?:["']([^"']+)["'])?\s*\)/g,
  /const\s+(\w+)\s*=\s*useValidationTranslations\(\s*(?:["']([^"']+)["'])?\s*\)/g,
  /const\s+(\w+)\s*=\s*await\s+get(?:Web)?Translations(?:\s+as\s+\w+)?\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/g,
];
const tWithNsRe = /\b(\w+)\(\s*["']([^"']+)["']\s*,\s*\{[^}]*\bns:\s*["']([^"']+)["']/g;
const tCallRe = /\b(\w+)\(\s*["']([^"']+)["'](?!\s*,\s*\{[^}]*\bns:)/g;

const usedKeys = new Map();

function addUsage(namespace, key) {
  const full = key ? `${namespace}.${key}` : namespace;
  if (!usedKeys.has(full)) {
    usedKeys.set(full, new Set());
  }
}

function collectBindings(content) {
  const bindings = new Map();
  for (const re of hookBindingRes) {
    for (const match of content.matchAll(re)) {
      const [, varName, nsOrPrefix, maybePrefix] = match;
      if (re.source.includes("useCommonTranslations")) {
        bindings.set(varName, { ns: "common", prefix: nsOrPrefix ?? "" });
      } else if (re.source.includes("useValidationTranslations")) {
        bindings.set(varName, { ns: "validation", prefix: nsOrPrefix ?? "" });
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

for (const locale of LOCALES) {
  const missing = [];
  for (const full of usedKeys.keys()) {
    const dot = full.indexOf(".");
    const ns = dot === -1 ? full : full.slice(0, dot);
    const key = dot === -1 ? "" : full.slice(dot + 1);
    const resource = namespaceResources[ns]?.[locale];
    if (!resource) {
      missing.push(`${full} (unknown namespace)`);
      continue;
    }
    if (key && !keyExists(resource, key)) {
      missing.push(full);
    }
  }
  missing.sort();
  console.log(`\nUsed keys missing for ${locale}: ${missing.length}`);
  for (const key of missing.slice(0, 30)) {
    console.log(`  ${key}`);
  }
  if (missing.length > 30) {
    console.log(`  ... and ${missing.length - 30} more`);
  }
  if (missing.length > 0) {
    fail(`missing used translation keys for locale ${locale}`);
  }
}

// Structural key parity (cs/de vs en) for all manifest namespaces
function isAllowedExtraKey(key) {
  return /_(few|many|zero)$/.test(key);
}

for (const [name] of Object.entries(manifest.namespaces)) {
  const referenceKeys = new Set(collectKeys(namespaceResources[name].en));
  for (const locale of LOCALES) {
    if (locale === "en") {
      continue;
    }
    const keys = new Set(collectKeys(namespaceResources[name][locale]));
    const missing = [...referenceKeys].filter((key) => !keys.has(key));
    const extra = [...keys].filter((key) => !referenceKeys.has(key) && !isAllowedExtraKey(key));
    if (missing.length > 0 || extra.length > 0) {
      console.log(
        `\nKey parity for "${name}" (${locale} vs en): missing=${missing.length}, extra=${extra.length}`,
      );
      fail(`key parity failed for namespace "${name}" (${locale})`);
    }
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

const statusResult = spawnSync(
  process.execPath,
  [i18nextCliPath, "status", "-c", "packages/translations/i18next.config.ts"],
  { cwd: repoRoot, stdio: "inherit" },
);

if (statusResult.status !== 0) {
  fail("i18next-cli status reported incomplete translations");
}

if (failed) {
  process.exit(1);
}

console.log("\ni18n status check passed.");
