/**
 * Fail CI when a docs page has a missing or malformed `last_updated` date.
 *
 * `last_updated` drives the "Last updated September 30, 2026" line in the docs
 * footer. The date is authored by hand rather than derived from Git, so a typo fix can
 * leave it alone and a content change sets it. The trade is that nothing else
 * can guarantee the field exists, which is this check's job.
 *
 * It validates presence and calendar validity only. It does not compare the
 * value against Git history, because a hand-authored date may be older than the
 * last commit.
 *
 * Usage: node scripts/check/check-docs-frontmatter.mjs (pnpm run check:docs:frontmatter)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-docs-frontmatter");

/** Directories whose pages are generated, so they carry no authored fields. */
const EXCLUDED_DIRECTORIES = new Set(["_generated"]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const docsRoot = join(repoRoot, "docs");

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

function repoPath(filePath) {
  return relative(repoRoot, filePath).split(sep).join("/");
}

/** The frontmatter key value, or `null` when the field is absent. */
function readLastUpdated(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: false, value: null };
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endIndex === -1) {
    return { frontmatter: false, value: null };
  }

  for (const line of lines.slice(1, endIndex)) {
    const match = /^last_updated\s*:\s*(.*)$/.exec(line);
    if (match) {
      return { frontmatter: true, value: match[1].trim().replace(/^["']|["']$/g, "") };
    }
  }

  return { frontmatter: true, value: null };
}

/** `true` when the value is a real calendar date in `YYYY-MM-DD` form. */
function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

let checked = 0;

for (const filePath of walkMdxFiles(docsRoot).sort()) {
  const path = repoPath(filePath);
  const { frontmatter, value } = readLastUpdated(readFileSync(filePath, "utf8"));

  if (!frontmatter) {
    check.add(`${path}: missing frontmatter`);
    continue;
  }

  if (value === null || value === "") {
    check.add(`${path}: missing last_updated`);
    continue;
  }

  if (!isCalendarDate(value)) {
    check.add(`${path}: last_updated is not a YYYY-MM-DD calendar date: ${value}`);
    continue;
  }

  checked += 1;
}

check.ok(`${checked} pages checked`);
