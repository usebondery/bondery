/** Read, diff, and write the generated plugin folders. */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

const ZIP_SCRIPT = [
  "import pathlib, sys, zipfile",
  "root = pathlib.Path('.')",
  "destination = pathlib.Path(sys.argv[1])",
  "with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as archive:",
  "    paths = sorted(path for path in root.rglob('*') if path.is_file())",
  "    for path in paths:",
  "        archive.write(path, path.as_posix())",
].join("\n");

function resolveInside(dir, rel) {
  const segments = rel.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Refusing to write outside the plugin folder: ${rel}`);
  }
  return resolve(dir, rel);
}

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const out = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const abs = join(current, entry);
      const info = lstatSync(abs);
      if (info.isDirectory() && !info.isSymbolicLink()) {
        walk(abs);
        continue;
      }
      out.push(relative(dir, abs).split(sep).join("/"));
    }
  };
  walk(dir);
  return out.sort();
}

export function diffTree(dir, files) {
  const diffs = [];
  const actual = new Set(listFiles(dir));
  for (const rel of actual) {
    if (!files.has(rel)) {
      diffs.push(`unexpected file ${rel}`);
    }
  }
  for (const [rel, body] of files) {
    if (!actual.has(rel)) {
      diffs.push(`missing file ${rel}`);
      continue;
    }
    if (!readFileSync(join(dir, rel)).equals(body)) {
      diffs.push(`content differs ${rel}`);
    }
  }
  return diffs;
}

function removeEmptyDirs(dir) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (!lstatSync(abs).isDirectory()) {
      continue;
    }
    removeEmptyDirs(abs);
    if (readdirSync(abs).length === 0) {
      rmdirSync(abs);
    }
  }
}

export function writeTree(dir, files) {
  mkdirSync(dir, { recursive: true });
  for (const [rel, body] of files) {
    const abs = resolveInside(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  }
  for (const rel of listFiles(dir)) {
    if (!files.has(rel)) {
      rmSync(resolveInside(dir, rel), { force: true });
    }
  }
  removeEmptyDirs(dir);
}

export function writeZip(root, files) {
  const dir = mkdtempSync(join(tmpdir(), "bondery-openai-plugin-"));
  try {
    writeTree(dir, files);
    const zipPath = join(root, "tmp/bondery-openai-plugin.zip");
    mkdirSync(dirname(zipPath), { recursive: true });
    rmSync(zipPath, { force: true });
    execFileSync("python3", ["-c", ZIP_SCRIPT, zipPath], { cwd: dir });
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}
