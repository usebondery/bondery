/**
 * Codemod: convert extensionless relative imports in package src trees to hash imports with .js suffix.
 * Usage: node scripts/migrate-package-hash-imports.mjs [package-name]
 */
import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const filterPkg = process.argv[2];

const PACKAGE_SRC_DIRS = [
  "schemas",
  "helpers",
  "vcard",
  "emails",
  "branding",
  "mantine-next",
  "translations",
]
  .filter((name) => !filterPkg || name === filterPkg.replace("@bondery/", ""))
  .map((name) => join(root, "packages", name, "src"));

const IMPORT_RE =
  /\b(from|export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from)\s+(["'])(\.\.?\/[^"']+)\2/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*(["'])(\.\.?\/[^"']+)\1\s*\)/g;

function resolveSourcePath(fileDir, specifier) {
  const base = resolve(fileDir, specifier);
  const candidates = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return `${base}.ts`;
}

function toHashImport(fileDir, srcRoot, specifier) {
  const target = resolveSourcePath(fileDir, specifier);
  let rel = relative(srcRoot, target).replace(/\\/g, "/");
  rel = rel.replace(/\.tsx$/, "").replace(/\.ts$/, "");
  return `#${rel}.js`;
}

function migrateCode(code, fileDir, srcRoot) {
  const replaceSpecifier = (full, prefix, quote, specifier) => {
    if (specifier.endsWith(".json") || specifier.endsWith(".css") || specifier.endsWith(".svg")) {
      return full;
    }
    const hash = toHashImport(fileDir, srcRoot, specifier);
    return `${prefix} ${quote}${hash}${quote}`;
  };

  return code
    .replace(IMPORT_RE, replaceSpecifier)
    .replace(DYNAMIC_IMPORT_RE, (full, quote, specifier) => {
      if (specifier.endsWith(".json") || specifier.endsWith(".css") || specifier.endsWith(".svg")) {
        return full;
      }
      const hash = toHashImport(fileDir, srcRoot, specifier);
      return `import(${quote}${hash}${quote})`;
    });
}

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const srcDir of PACKAGE_SRC_DIRS) {
  try {
    await stat(srcDir);
  } catch {
    continue;
  }
  const files = await collectSourceFiles(srcDir);
  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    const updated = migrateCode(original, dirname(filePath), srcDir);
    if (updated !== original) {
      await writeFile(filePath, updated, "utf8");
      changed += 1;
      console.log(`updated: ${relative(root, filePath)}`);
    }
  }
}
console.log(`Done. ${changed} file(s) updated.`);
