import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";
import {
  ALL_LOCALES as LOCALES,
  localesForNamespace,
  SOURCE_LOCALE,
} from "./lib/namespace-locales.mjs";

const TSX_JSX_MJS_RE = /\.(tsx?|jsx?|mjs)$/;

const check = createCheck("check-i18n-structure");

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

/** Longest list of files the report prints per category before it shows only a count. */
const MAX_LISTED_FILES = 20;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const localesRoot = path.join(repoRoot, "packages/translations/src/locales");
const manifestPath = path.join(repoRoot, "packages/translations/manifest.json");
const APP_LOCALE_CODES = LOCALES;
const SCAN_ROOTS = [
  path.join(repoRoot, "apps/webapp/src"),
  path.join(repoRoot, "apps/mobile/src"),
  path.join(repoRoot, "apps/website/src"),
];

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
    } else if (TSX_JSX_MJS_RE.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function walkJson(dir, prefix = "", acc = []) {
  if (!fs.existsSync(dir)) {
    return acc;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJson(full, rel, acc);
    } else if (entry.name.endsWith(".json")) {
      acc.push(rel.replace(/\\/g, "/"));
    }
  }
  return acc;
}

function loadNamespaceJson(locale, relativePath) {
  const filePath = path.join(localesRoot, locale, relativePath);
  return asUnknown(JSON.parse(fs.readFileSync(filePath, "utf8")));
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// --- Locale file tree parity ---
const enFiles = new Set(walkJson(path.join(localesRoot, SOURCE_LOCALE)));
const englishOnlyFiles = new Set(
  Object.values(manifest.namespaces)
    .filter((entry) => entry.englishOnly)
    .map((entry) => entry.path.replace(/\\/g, "/")),
);
for (const locale of LOCALES) {
  if (locale === SOURCE_LOCALE) {
    continue;
  }
  const localeFiles = new Set(walkJson(path.join(localesRoot, locale)));
  const missing = [...enFiles]
    .filter((file) => !englishOnlyFiles.has(file) && !localeFiles.has(file))
    .sort((left, right) => left.localeCompare(right));
  const extra = [...localeFiles]
    .filter((file) => !enFiles.has(file))
    .sort((left, right) => left.localeCompare(right));
  for (const file of localeFiles) {
    if (englishOnlyFiles.has(file)) {
      fail(
        `${locale} has a translation of the englishOnly namespace file ${file}. Remove "englishOnly" from the manifest entry once a namespace is translated.`,
      );
    }
  }
  console.log(
    `\nFile tree parity (${locale} vs en): missing=${missing.length}, extra=${extra.length}`,
  );
  for (const file of missing.slice(0, MAX_LISTED_FILES)) {
    console.log(`  - ${file}`);
  }
  if (missing.length > MAX_LISTED_FILES) {
    console.log(`  ... and ${missing.length - MAX_LISTED_FILES} more`);
  }
  for (const file of extra.slice(0, MAX_LISTED_FILES)) {
    console.log(`  + ${file}`);
  }
  if (missing.length > 0 || extra.length > 0) {
    fail(`${locale} locale file tree does not match en`);
  }
}

// --- Manifest ↔ filesystem ---
for (const [name, entry] of Object.entries(manifest.namespaces)) {
  for (const locale of localesForNamespace(entry)) {
    const filePath = path.join(localesRoot, locale, entry.path);
    if (!fs.existsSync(filePath)) {
      fail(`manifest namespace "${name}" missing file: locales/${locale}/${entry.path}`);
    }
  }
}

for (const file of enFiles) {
  const manifestEntry = Object.entries(manifest.namespaces).find(
    ([, entry]) => entry.path.replace(/\\/g, "/") === file,
  );
  if (!manifestEntry) {
    fail(`orphan locale file without manifest entry: ${file}`);
  }
}

// --- App locale catalog ↔ Languages exonym keys ---
const languagesRelativePath = manifest.namespaces.Languages?.path;
if (languagesRelativePath) {
  for (const locale of LOCALES) {
    const languagesJson = loadNamespaceJson(locale, languagesRelativePath);
    const missingExonyms = APP_LOCALE_CODES.filter((code) => languagesJson[code] === undefined);
    if (missingExonyms.length > 0) {
      console.log(`\nLanguages.json (${locale}) missing exonyms for: ${missingExonyms.join(", ")}`);
      fail(`Languages.json (${locale}) missing exonym keys from supported-locales.json`);
    }
  }
} else {
  fail('manifest missing "Languages" namespace for app locale exonyms');
}

// --- Forbidden patterns ---
const forbidden = [
  { label: "loadTranslation", pattern: /\bloadTranslation\b/ },
  { label: "translationsByLocale", pattern: /\btranslationsByLocale\b/ },
  {
    label: "import { en }",
    pattern: /import\s*\{\s*en\s*\}\s*from\s*["']@bondery\/translations["']/,
  },
  { label: "WebAppCommon", pattern: /\bWebAppCommon\b/ },
  { label: "MobileApp.", pattern: /MobileApp\./ },
  {
    label: "useTranslations dotted namespace",
    pattern: /\buseTranslations\(\s*["'][^"']+\.[^"']+["']\s*\)/,
  },
];

for (const root of SCAN_ROOTS) {
  for (const file of walk(root)) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
    if (rel.includes("/scripts/codemod-")) {
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    for (const { pattern, label } of forbidden) {
      if (pattern.test(content)) {
        fail(`forbidden pattern "${label}" in ${rel}`);
      }
    }
  }
}

check.ok();
