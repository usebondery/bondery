import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const localesRoot = path.join(packageRoot, "src/locales");
const mirrorRoot = path.join(packageRoot, ".i18next-cli-mirror");
const manifestPath = path.join(packageRoot, "manifest.json");
const catalogPath = path.join(repoRoot, "packages/schemas/locale/supported-locales.json");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const locales = catalog.supported.map((entry) => entry.code);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const rmOptions = { force: true, maxRetries: 3, retryDelay: 50 };

function removeFile(target) {
  if (!fs.existsSync(target)) {
    return;
  }

  try {
    const mode = fs.lstatSync(target).mode;
    if ((mode & 0o200) === 0) {
      fs.chmodSync(target, mode | 0o200);
    }
  } catch {
    // Best-effort: clear read-only bit before delete on Windows.
  }

  fs.rmSync(target, rmOptions);
}

function copyMirrorFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  removeFile(target);

  const resolvedSource = path.resolve(source);
  const resolvedTarget = path.resolve(target);

  try {
    fs.copyFileSync(resolvedSource, resolvedTarget);
    return;
  } catch {
    // copyFile can fail on Windows when the destination was briefly locked.
  }

  fs.writeFileSync(resolvedTarget, fs.readFileSync(resolvedSource));
}

function linkOrCopy(source, target) {
  if (process.platform === "win32") {
    copyMirrorFile(source, target);
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  removeFile(target);

  const relativeSource = path.relative(path.dirname(target), source);
  try {
    fs.symlinkSync(relativeSource, target, "file");
    return;
  } catch {
    // Fall back to hardlink then copy on Unix sandboxes without symlink support.
  }

  try {
    fs.linkSync(source, target);
    return;
  } catch {
    copyMirrorFile(source, target);
  }
}

if (fs.existsSync(mirrorRoot)) {
  fs.rmSync(mirrorRoot, { recursive: true, ...rmOptions });
}

let linked = 0;

for (const locale of locales) {
  for (const [namespace, entry] of Object.entries(manifest.namespaces)) {
    const source = path.join(localesRoot, locale, entry.path.replace(/\\/g, "/"));
    const target = path.join(mirrorRoot, locale, `${namespace}.json`);

    if (!fs.existsSync(source)) {
      console.error(`Missing locale file for mirror: locales/${locale}/${entry.path}`);
      process.exit(1);
    }

    linkOrCopy(source, target);
    linked += 1;
  }
}

console.log(
  `Locale mirror synced: ${linked} files (${Object.keys(manifest.namespaces).length} namespaces × ${locales.length} locales)`,
);
