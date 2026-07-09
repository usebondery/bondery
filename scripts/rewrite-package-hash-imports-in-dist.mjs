/**
 * Rewrites internal hash imports in package dist folders to relative paths.
 * tsc preserves package.json "imports" specifiers; Node/Next consumers need relative ESM paths.
 *
 * Usage: node scripts/rewrite-package-hash-imports-in-dist.mjs [package-dir ...]
 * Default: all compilable packages under packages/
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PACKAGES = [
  "schemas",
  "helpers",
  "vcard",
  "emails",
  "branding",
  "mantine-next",
  "translations",
];

const HASH_IMPORT_RE =
  /(?<=(?:from|export)\s+["'])#([^"']+)(?=["'])|(?<=import\s*\(\s*["'])#([^"']+)(?=["']\s*\))/g;

function toRelativePath(fromFile, hashSpecifier) {
  const fromDir = dirname(fromFile);
  const distRoot = fromFile.match(/^(.*[/\\]dist)(?:[/\\]|$)/)?.[1] ?? join(fromDir, "..");
  const target = join(distRoot, hashSpecifier);
  let rel = relative(fromDir, target).replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = `./${rel}`;
  }
  return rel;
}

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(full)));
    } else if (entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function rewriteFile(code, filePath) {
  return code.replace(HASH_IMPORT_RE, (_match, fromGroup, dynamicGroup) => {
    const specifier = fromGroup ?? dynamicGroup;
    return toRelativePath(filePath, specifier);
  });
}

async function rewritePackage(pkgName) {
  const distDir = join(root, "packages", pkgName, "dist");
  try {
    await stat(distDir);
  } catch {
    console.warn(`skip ${pkgName}: no dist/`);
    return 0;
  }

  const files = await collectJsFiles(distDir);
  let changed = 0;
  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    if (!original.includes("#")) {
      continue;
    }
    const updated = rewriteFile(original, filePath);
    if (updated !== original) {
      await writeFile(filePath, updated);
      changed++;
    }
  }
  console.log(`rewrote # imports in ${changed} file(s) under packages/${pkgName}/dist`);
  return changed;
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PACKAGES;

for (const pkg of targets) {
  await rewritePackage(pkg);
}
