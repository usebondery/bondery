/**
 * Rewrites internal hash imports in package dist folders to relative paths.
 * tsc preserves package.json "imports" specifiers; Node/Next consumers need relative ESM paths.
 *
 * Then copies dist into pnpm injected workspace copies. `injectWorkspacePackages`
 * does not symlink; Next reads `apps/webapp/node_modules/@bondery/<pkg>`, not
 * `packages/<pkg>/dist`. `syncInjectedDepsAfterScripts` only runs after `build`
 * and `compile` exit, so watch must copy here.
 *
 * Usage: node scripts/pkg/rewrite-package-hash-imports-in-dist.mjs [package-dir ...]
 * Default: all compilable packages under packages/
 */
import { cp, lstat, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
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
  await syncInjectedDist(pkgName);
  return changed;
}

function skipInjectedPath(dest) {
  const normalized = dest.replaceAll("\\", "/");
  return normalized.includes("/.ignored_") || normalized.includes("_pacquet-stage_");
}

async function collectInjectedPackageDirs(pkgName) {
  const sourcePkg = join(root, "packages", pkgName);
  const sourceReal = await realpath(sourcePkg);
  const candidates = [join(root, "node_modules", "@bondery", pkgName)];
  for (const group of ["apps", "packages"]) {
    const groupDir = join(root, group);
    let entries;
    try {
      entries = await readdir(groupDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      candidates.push(join(groupDir, entry.name, "node_modules", "@bondery", pkgName));
    }
  }

  const dests = [];
  const sourceDist = join(sourcePkg, "dist");
  for (const dest of candidates) {
    if (skipInjectedPath(dest)) {
      continue;
    }
    let destStat;
    try {
      destStat = await lstat(dest);
    } catch {
      continue;
    }
    if (destStat.isSymbolicLink()) {
      continue;
    }
    const destReal = await realpath(dest);
    if (destReal === sourceReal) {
      continue;
    }
    if (await distAlreadyHardlinked(sourceDist, dest)) {
      continue;
    }
    dests.push(dest);
  }
  return dests;
}

async function distAlreadyHardlinked(sourceDist, dest) {
  try {
    const [srcStat, destStat] = await Promise.all([
      lstat(join(sourceDist, "index.js")),
      lstat(join(dest, "dist", "index.js")),
    ]);
    return srcStat.ino === destStat.ino && srcStat.dev === destStat.dev;
  } catch {
    return false;
  }
}

async function syncInjectedDist(pkgName) {
  const sourceDist = join(root, "packages", pkgName, "dist");
  try {
    await stat(sourceDist);
  } catch {
    return;
  }
  const dests = await collectInjectedPackageDirs(pkgName);
  for (const dest of dests) {
    await cp(sourceDist, join(dest, "dist"), { force: true, recursive: true });
  }
  if (dests.length > 0) {
    console.log(
      `synced dist to ${dests.length} injected cop${dests.length === 1 ? "y" : "ies"} of @bondery/${pkgName}`,
    );
  }
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PACKAGES;

for (const pkg of targets) {
  await rewritePackage(pkg);
}
