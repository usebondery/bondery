/**
 * Authoritative i18n CI gate: validates used keys (regex + manifest paths),
 * TypedTrans i18nKey usage, secondary-locale key parity, and representative-key
 * regression coverage for namespace-scoped hooks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import localeCatalog from "@bondery/schemas/locale/supported-locales.json" with { type: "json" };

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-i18n-usage");

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const localesRoot = path.join(packageRoot, "src/locales");
const manifestPath = path.join(packageRoot, "manifest.json");
const LOCALES = localeCatalog.supported.map((entry) => entry.code);

const SCAN_ROOTS = [
  path.join(repoRoot, "apps/webapp/src"),
  path.join(repoRoot, "apps/mobile/src"),
  path.join(repoRoot, "apps/mobile/app"),
  path.join(repoRoot, "apps/chrome-extension/src"),
  path.join(repoRoot, "apps/website/src"),
];

const REPRESENTATIVE_KEYS = [
  "SettingsPage:DataManagement.VCardImport.ModalTitle",
  "SettingsPage:DataManagement.LinkedInImport.ModalTitle",
  "common:actions.cancel",
  "validation:fields.firstName.required",
  "UnavailablePage:StatusOnline",
  "ChatPage:title",
  "LoginPage:TermsText",
];

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

function fail(message) {
  check.add(message);
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
  /const\s+(\w+)\s*=\s*use([A-Za-z]+)Translations\(\s*(?:["']([^"']+)["'])?/g,
  /const\s+(\w+)\s*=\s*await\s+get([A-Za-z]+)Translations\(\s*(?:["']([^"']+)["'])?/g,
];
const tWithNsRe = /\b(\w+)\(\s*["']([^"']+)["']\s*,\s*\{[^}]*\bns:\s*["']([^"']+)["']/g;
const tCallRe = /\b(\w+)\(\s*["']([^"']+)["'](?!\s*,\s*\{[^}]*\bns:)/g;
const transI18nKeyFirstRe = /\bi18nKey=\{?"([^"']+)"\}?[\s\S]{0,1200}?\bt=\{(\w+)\}/g;
const transTFirstRe = /\bt=\{(\w+)\}[\s\S]{0,1200}?\bi18nKey=\{?"([^"']+)"\}?/g;

const usedKeys = new Map();
const discovered = new Set();

function addUsage(namespace, key) {
  const dotFull = key ? `${namespace}.${key}` : namespace;
  const colonFull = key ? `${namespace}:${key}` : namespace;
  if (!usedKeys.has(dotFull)) {
    usedKeys.set(dotFull, new Set());
  }
  discovered.add(colonFull);
}

function collectBindings(content) {
  const bindings = new Map();
  for (const re of hookBindingRes) {
    for (const match of content.matchAll(re)) {
      const [, varName, hookSuffix, prefix] = match;
      const ns = namespaceFromGeneratedHook(hookSuffix);
      if (!manifest.namespaces[ns]) {
        continue;
      }
      bindings.set(varName, {
        ns,
        prefix: prefix ?? "",
      });
    }
  }
  return bindings;
}

function collectTransKeys(content, bindings) {
  for (const re of [transI18nKeyFirstRe, transTFirstRe]) {
    for (const match of content.matchAll(re)) {
      const key = re === transTFirstRe ? match[2] : match[1];
      const varName = re === transTFirstRe ? match[1] : match[2];
      const ctx = bindings.get(varName);
      if (!ctx) {
        continue;
      }
      const fullKey = [ctx.prefix, key].filter(Boolean).join(".");
      addUsage(ctx.ns, fullKey);
    }
  }
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
    collectTransKeys(content, bindings);
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

function isAllowedExtraKey(key) {
  return /_(few|many|zero|two)$/.test(key);
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

for (const key of REPRESENTATIVE_KEYS) {
  if (!discovered.has(key)) {
    check.add(`representative key not discovered by hook scanner: ${key}`);
  }
}

check.ok(`${discovered.size} keys discovered`);
