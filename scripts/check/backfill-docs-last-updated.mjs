/**
 * One-shot backfill: write `last_updated` into every docs page frontmatter.
 *
 *   node scripts/check/backfill-docs-last-updated.mjs           # apply
 *   node scripts/check/backfill-docs-last-updated.mjs --dry-run # report only
 *
 * The date comes from Git history: the committer date of the last commit that
 * touched the file, as a UTC `YYYY-MM-DD` calendar date.
 *
 * This script exists only to seed a repo that predates the field. After the
 * backfill, `last_updated` is authored by hand: a typo fix keeps the old date.
 * Delete this script once every page carries the field.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const docsRoot = join(repoRoot, "docs");

/** Generated API pages have no Git history; they are not authored. */
const EXCLUDED_DIRECTORIES = new Set(["_generated"]);

const dryRun = process.argv.includes("--dry-run");

function walkMdxFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry)) {
        walkMdxFiles(full, acc);
      }
    } else if (entry.endsWith(".mdx")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Committer date (UTC `YYYY-MM-DD`) of the last commit that touched the file. */
function gitDateFor(repoPath) {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", repoPath], {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();

    if (!iso) {
      return undefined;
    }

    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}

/**
 * Insert `last_updated` as the final frontmatter key, keeping the block valid.
 *
 * The file's own line ending is preserved. Writing `\n` into a CRLF file would
 * rewrite every line and bury the one-line change in a whole-file diff.
 */
function withLastUpdated(content, date) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return undefined;
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endIndex === -1) {
    return undefined;
  }

  if (lines.slice(1, endIndex).some((line) => /^last_updated\s*:/.test(line))) {
    return undefined;
  }

  lines.splice(endIndex, 0, `last_updated: ${date}`);
  return lines.join(eol);
}

/**
 * Write with a short retry loop.
 *
 * A dev server, a type watcher, or an editor holding the file can reject the
 * write on Windows with a transient lock. Retrying avoids aborting a 201-file
 * backfill on the first collision.
 */
function writeWithRetry(filePath, contents, attempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      writeFileSync(filePath, contents, "utf-8");
      return true;
    } catch (error) {
      if (attempt >= attempts) {
        console.error(`  ! could not write ${filePath}: ${error.code ?? error.message}`);
        return false;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200 * attempt);
    }
  }
}

let written = 0;
let skipped = 0;
const missing = [];
const failed = [];

for (const filePath of walkMdxFiles(docsRoot).sort()) {
  const repoPath = relative(repoRoot, filePath).split(sep).join("/");
  const content = readFileSync(filePath, "utf8");

  if (/^last_updated\s*:/m.test(content.split(/^---$/m)[1] ?? "")) {
    skipped += 1;
    continue;
  }

  const date = gitDateFor(repoPath);
  if (!date) {
    missing.push(repoPath);
    continue;
  }

  const next = withLastUpdated(content, date);
  if (next === undefined) {
    missing.push(repoPath);
    continue;
  }

  if (!dryRun) {
    if (!writeWithRetry(filePath, next)) {
      failed.push(repoPath);
      continue;
    }
  }
  written += 1;
}

console.log(`backfill-docs-last-updated: ${written} ${dryRun ? "would write" : "written"}`);
if (skipped > 0) {
  console.log(`  ${skipped} already had a date`);
}
if (missing.length > 0) {
  console.log(`  ${missing.length} without a date source:`);
  for (const path of missing) {
    console.log(`    - ${path}`);
  }
}
if (failed.length > 0) {
  console.log(`  ${failed.length} could not be written:`);
  for (const path of failed) {
    console.log(`    - ${path}`);
  }
}
if (missing.length > 0 || failed.length > 0) {
  process.exit(1);
}
