import { spawn, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  watch,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveTypescriptTsc } from "../../../scripts/pkg/resolve-typescript-tsc.mjs";

const packageRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const srcLocales = join(packageRoot, "src", "locales");
const distLocales = join(packageRoot, "dist", "locales");
const srcManifest = join(packageRoot, "manifest.json");
const distManifest = join(packageRoot, "dist", "manifest.json");
const generateResourceMap = join(packageRoot, "scripts", "generate-resource-map.mjs");

/**
 * Restart trigger for the `node --watch` API dev server in apps/api.
 *
 * The API imports locale JSON as modules, so a content edit is visible only
 * after a process restart. This stamp lives outside every `dist` directory, so
 * a package build cannot delete it and storm the watcher. The API watches this
 * one file instead of the 27 email folders.
 */
const emailStampPath = resolve(packageRoot, "../../.temp/translations-email-stamp.json");

const POLL_MS = 500;

/** Absolute source path to `${size}:${mtimeMs}`. */
let fingerprints = new Map();
/** Relative path list of the last observed file set. */
let fileSet = "";
/** Paths reported by `fs.watch` since the last sync. */
let candidates = new Set();

function isEmailLocalePath(absolutePath) {
  return absolutePath.split(sep).join("/").includes("/platform/email/");
}

/** Touch the API restart stamp. A changed stamp restarts the API. */
function touchEmailStamp() {
  try {
    mkdirSync(resolve(emailStampPath, ".."), { recursive: true });
    writeFileSync(emailStampPath, `${JSON.stringify({ changedAt: Date.now() })}\n`);
  } catch (error) {
    console.error("[translations] could not write email stamp:", error);
  }
}

function walkLocaleJson(dir, acc) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkLocaleJson(fullPath, acc);
    } else if (entry.name.endsWith(".json")) {
      acc.push(fullPath);
    }
  }
}

function fingerprintOf(path) {
  try {
    const stats = statSync(path);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return undefined;
  }
}

/** @returns {{ files: string[], map: Map<string, string>, set: string }} */
function scanLocales() {
  const files = [];
  walkLocaleJson(srcLocales, files);
  files.sort();
  const map = new Map();
  for (const file of files) {
    map.set(file, fingerprintOf(file) ?? "missing");
  }
  return {
    files,
    map,
    set: files.map((file) => relative(srcLocales, file).split(sep).join("/")).join("\n"),
  };
}

function copyRecursive(src, dest) {
  if (!existsSync(src)) {
    return;
  }
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.name.endsWith(".json")) {
      copyFileSync(srcPath, destPath);
    }
  }
}

/** Initial sync only. Later work goes through `copyOne`. */
function copyArtifacts() {
  copyRecursive(srcLocales, distLocales);
  if (existsSync(srcManifest)) {
    mkdirSync(join(packageRoot, "dist"), { recursive: true });
    copyFileSync(srcManifest, distManifest);
  }
}

/**
 * Copy one source file to its `dist` path.
 *
 * @param {string} absoluteSource
 * @returns {boolean} true when the copy ran
 */
function copyOne(absoluteSource) {
  const relativePath = relative(srcLocales, absoluteSource);
  if (relativePath.startsWith("..") || relativePath === "") {
    return false;
  }
  const target = join(distLocales, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  copyFileSync(absoluteSource, target);
  return true;
}

function runResourceMap() {
  const result = spawnSync(process.execPath, [generateResourceMap], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`generate-resource-map exited ${result.status ?? "null"}`);
  }
}

/**
 * Resolve a `fs.watch` filename to absolute source paths.
 *
 * Windows sends `\` separators and may send an empty filename. An empty name
 * means "unknown file", so the caller falls back to a full diff.
 *
 * @param {string | Buffer | null | undefined} filename
 * @returns {string[]}
 */
function changedPathsFromWatch(filename) {
  if (typeof filename !== "string" || filename.length === 0) {
    return [];
  }
  const absolute = join(srcLocales, filename);
  if (absolute.endsWith(".json")) {
    return [absolute];
  }
  const nested = [];
  walkLocaleJson(absolute, nested);
  return nested;
}

/**
 * Copy the changed files and regenerate the resource map when the set changed.
 *
 * The watcher reports candidate paths. A candidate is copied only when its
 * fingerprint differs. Files that `fs.watch` did not report still pass the
 * same check, so a missed event costs one full stat pass, not a full copy.
 */
function sync() {
  const snapshot = scanLocales();
  const setChanged = snapshot.set !== fileSet;
  const watched = [...candidates].filter(Boolean);
  candidates = new Set();

  const toCopy = [];
  for (const path of snapshot.map.keys()) {
    if (snapshot.map.get(path) !== fingerprints.get(path)) {
      toCopy.push(path);
    }
  }

  if (toCopy.length === 0 && !setChanged) {
    return;
  }

  let copied = 0;
  for (const path of toCopy) {
    if (copyOne(path)) {
      copied += 1;
    }
  }
  if (existsSync(srcManifest)) {
    mkdirSync(join(packageRoot, "dist"), { recursive: true });
    copyFileSync(srcManifest, distManifest);
  }
  if (setChanged) {
    runResourceMap();
  }

  fingerprints = snapshot.map;
  fileSet = snapshot.set;

  if (toCopy.some(isEmailLocalePath)) {
    touchEmailStamp();
  }

  // Dev webapp reads locale JSON from disk through `diskResourceLoader`.
  // A content edit needs no JS recompile, so this script writes no
  // locale-watch-stamp. A stamp write made Turbopack reload the whole app.
  const names = toCopy.map((path) => relative(srcLocales, path)).join(", ");
  const source = names || `${watched.length} watched path(s)`;
  const extra = setChanged ? ", resource-map" : "";
  console.log(`[translations] copied ${copied} file(s): ${source}${extra}`);
}

copyArtifacts();
runResourceMap();
const initial = scanLocales();
fingerprints = initial.map;
fileSet = initial.set;
console.log(`[translations] watching ${initial.files.length} locale JSON files`);

if (existsSync(srcLocales)) {
  try {
    // Windows often emits `rename` for atomic saves; do not filter to `change`.
    watch(srcLocales, { recursive: true }, (eventType, filename) => {
      const paths = changedPathsFromWatch(filename);
      if (paths.length === 0) {
        // Unknown path: keep the empty marker so `sync` diffs every file.
        candidates.add("");
        return;
      }
      for (const path of paths) {
        candidates.add(path);
      }
      void eventType;
    });
  } catch (error) {
    console.warn("[translations] fs.watch unavailable; poll-only", error);
  }
}

setInterval(() => {
  try {
    sync();
  } catch (error) {
    console.error("[translations] sync failed:", error);
  }
}, POLL_MS);

const tscBin = resolveTypescriptTsc([packageRoot, resolve(packageRoot, "../..")]);
if (!tscBin) {
  console.error("[translations] could not resolve TypeScript compiler");
  process.exit(1);
}
const tsc = spawn(process.execPath, [tscBin, "--watch", "--preserveWatchOutput"], {
  cwd: packageRoot,
  stdio: "inherit",
});

tsc.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  tsc.kill("SIGINT");
  process.exit(0);
});
