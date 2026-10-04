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
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");

const srcLocales = join(packageRoot, "src", "locales");
const distLocales = join(packageRoot, "dist", "locales");
const srcManifest = join(packageRoot, "manifest.json");
const distManifest = join(packageRoot, "dist", "manifest.json");
const distStamp = join(packageRoot, "dist", "generated", "locale-watch-stamp.js");
const generateResourceMap = join(packageRoot, "scripts", "generate-resource-map.mjs");

const POLL_MS = 500;
const DEBOUNCE_MS = 400;
const STAMP_REWATCH_MS = 400;

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

function collectLocaleJson(dir, files) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectLocaleJson(fullPath, files);
    } else if (entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
}

function fingerprintLocales() {
  const files = [];
  collectLocaleJson(srcLocales, files);
  files.sort();
  const lines = [];
  for (const file of files) {
    try {
      const stats = statSync(file);
      lines.push(`${file}:${stats.size}:${stats.mtimeMs}`);
    } catch {
      lines.push(`${file}:missing`);
    }
  }
  if (existsSync(srcManifest)) {
    const stats = statSync(srcManifest);
    lines.push(`manifest:${stats.size}:${stats.mtimeMs}`);
  }
  return {
    count: files.length,
    fileSet: files.map((file) => file.replaceAll("\\", "/")).join("\n"),
    key: lines.join("\n"),
  };
}

function copyArtifacts() {
  copyRecursive(srcLocales, distLocales);
  if (existsSync(srcManifest)) {
    mkdirSync(join(packageRoot, "dist"), { recursive: true });
    copyFileSync(srcManifest, distManifest);
  }
}

function writeWatchStamp() {
  mkdirSync(join(packageRoot, "dist", "generated"), { recursive: true });
  writeFileSync(distStamp, `export const localeWatchStamp = ${Date.now()};\n`);
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

let lastFingerprint = "";
let lastFileSet = "";
let syncing = false;
let pendingReason = null;
let debounceTimer;
let stampRewriteTimer;

function maybeSync(reason) {
  if (syncing) {
    pendingReason = reason;
    return;
  }

  const snap = fingerprintLocales();
  if (snap.key === lastFingerprint) {
    return;
  }

  syncing = true;
  try {
    const fileSetChanged = snap.fileSet !== lastFileSet;
    copyArtifacts();
    if (fileSetChanged) {
      runResourceMap();
    }
    // Delay the JS-byte poke so tsc --watch does not overwrite the stamp with `0`.
    clearTimeout(stampRewriteTimer);
    stampRewriteTimer = setTimeout(writeWatchStamp, STAMP_REWATCH_MS);
    lastFingerprint = snap.key;
    lastFileSet = snap.fileSet;
    const extra = fileSetChanged ? ", resource-map" : "";
    console.log(`[translations] synced ${snap.count} locale JSON → dist (${reason}${extra})`);
  } catch (error) {
    console.error("[translations] sync failed:", error);
  } finally {
    syncing = false;
    if (pendingReason) {
      const nextReason = pendingReason;
      pendingReason = null;
      maybeSync(nextReason);
    }
  }
}

function scheduleSync(reason) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    maybeSync(reason);
  }, DEBOUNCE_MS);
}

copyArtifacts();
runResourceMap();
const initial = fingerprintLocales();
lastFingerprint = initial.key;
lastFileSet = initial.fileSet;
console.log(`[translations] watching ${initial.count} locale JSON files`);

if (existsSync(srcLocales)) {
  try {
    // Windows often emits `rename` for atomic saves; do not filter to `change`.
    watch(srcLocales, { recursive: true }, (eventType, filename) => {
      const file = typeof filename === "string" ? filename : "";
      scheduleSync(file ? `fs.watch ${eventType}: ${file}` : `fs.watch ${eventType}`);
    });
  } catch (error) {
    console.warn("[translations] fs.watch unavailable; poll-only", error);
  }
}

setInterval(() => {
  if (fingerprintLocales().key !== lastFingerprint) {
    scheduleSync("poll");
  }
}, POLL_MS);

const tsc = spawn(
  process.execPath,
  [join(repoRoot, "node_modules/typescript/bin/tsc"), "--watch", "--preserveWatchOutput"],
  { cwd: packageRoot, stdio: "inherit" },
);

tsc.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  tsc.kill("SIGINT");
  process.exit(0);
});
