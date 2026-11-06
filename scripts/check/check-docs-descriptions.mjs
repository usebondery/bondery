/**
 * Fail CI when a docs page has a missing or badly sized `description`.
 *
 * The `description` frontmatter field doubles as the lead paragraph under the H1,
 * the folder-index tile text, the `<meta name="description">` tag, and the line
 * text in `llms.txt`. A short or missing value leaves those surfaces empty.
 *
 * A value in the warning band still renders, but it wastes the strongest
 * characters on a tile or in a search result. That case warns without failing,
 * so an existing page never blocks a merge while the text is being rewritten.
 *
 * Usage: node scripts/check/check-docs-descriptions.mjs (pnpm run check:docs:descriptions)
 * Pass `--strict` to fail on the warning band too.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-docs-descriptions");

/** Pass band. A description in this range renders well on every surface. */
const MIN_LENGTH = 140;
const MAX_LENGTH = 160;

/** Warning band. Renders, but leaves too little room for a distinguishing qualifier. */
const WARN_MIN_LENGTH = 120;

const EXCLUDED_DIRECTORIES = new Set(["adr", "_generated"]);

/**
 * Changelog pages that are not shipped releases.
 *
 * `unreleased` is the in-flight draft: it is hidden and never published, so it
 * has no public URL, no search snippet, and no need for a description. Every
 * dated release page is published, sitemapped, and indexed, so each one needs
 * its own `description`.
 */
const UNPUBLISHED_CHANGELOG_PAGES = new Set(["docs/changelog/unreleased.mdx"]);

const strict = process.argv.includes("--strict");

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const docsRoot = join(repoRoot, "docs");

function walkMdxFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (EXCLUDED_DIRECTORIES.has(entry)) {
        continue;
      }
      walkMdxFiles(full, acc);
    } else if (entry.endsWith(".mdx")) {
      acc.push(full);
    }
  }
  return acc;
}

function repoPath(filePath) {
  return relative(repoRoot, filePath).split(sep).join("/");
}

/**
 * Reads only the first frontmatter block.
 *
 * @returns {{ value: string | null, block: boolean } | null} `null` when the file
 * has no frontmatter. `block` is true for `>`/`|` scalars and indented values.
 */
function readDescription(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return null;
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (endIndex === -1) {
    return null;
  }

  const frontmatter = lines.slice(1, endIndex);
  const keyIndex = frontmatter.findIndex((line) => /^description\s*:/.test(line));
  if (keyIndex === -1) {
    return { block: false, value: null };
  }

  const inlineValue = frontmatter[keyIndex].replace(/^description\s*:\s*/, "").trim();
  if (
    inlineValue === ">" ||
    inlineValue === "|" ||
    inlineValue.startsWith(">") ||
    inlineValue.startsWith("|")
  ) {
    return { block: true, value: null };
  }
  if (inlineValue === "") {
    const next = frontmatter[keyIndex + 1] ?? "";
    return { block: next.startsWith(" ") || next.startsWith("\t"), value: null };
  }

  return { block: false, value: inlineValue };
}

function stripQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

let checked = 0;

/** Soft findings: they print a warning and fail only under `--strict`. */
const warnings = [];

/**
 * A generated release summary counts categories instead of naming changes:
 * "25 new features, 16 fixes, 24 changes". That sentence could describe any
 * release, so the check rejects it.
 */
const COUNTED_CATEGORY_PATTERN =
  /(?:^|[^\d.])\d+\s+(new features?|fixes|changes|breaking changes?|security fixes?|dependency updates?|ci changes?|test changes?|documentation updates?)\b/i;

function isGeneratedSummary(text) {
  return COUNTED_CATEGORY_PATTERN.test(text) || /release notes from/i.test(text);
}

/**
 * Release pages are a special case.
 *
 * The page title is a bare version (`1.11.0`), so the description must carry the
 * product name and that same version. That keeps the search snippet readable and
 * makes a description copied from another release fail.
 */
function changelogVersionFromPath(path) {
  const match = path.match(/^docs\/changelog\/(\d+\.\d+\.\d+)\.mdx$/);
  return match?.[1] ?? null;
}

for (const filePath of walkMdxFiles(docsRoot).sort()) {
  const path = repoPath(filePath);
  if (UNPUBLISHED_CHANGELOG_PAGES.has(path)) {
    continue;
  }
  const description = readDescription(readFileSync(filePath, "utf8"));

  if (description === null) {
    check.add(`${path}: missing frontmatter`);
    continue;
  }

  if (description.block) {
    check.add(`${path}: must be a single-line description`);
    continue;
  }

  if (description.value === null) {
    check.add(`${path}: missing description`);
    continue;
  }

  const text = stripQuotes(description.value);
  if (text.length > MAX_LENGTH) {
    check.add(`${path}: description is ${text.length} chars (max ${MAX_LENGTH}): ${text}`);
  } else if (text.length < WARN_MIN_LENGTH) {
    check.add(`${path}: description is ${text.length} chars (min ${WARN_MIN_LENGTH}): ${text}`);
  } else if (text.length < MIN_LENGTH) {
    const message = `${path}: description is ${text.length} chars (target ${MIN_LENGTH}-${MAX_LENGTH}): ${text}`;
    if (strict) {
      check.add(message);
    } else {
      warnings.push(message);
    }
  }

  const version = changelogVersionFromPath(path);
  if (version === null) {
    checked += 1;
    continue;
  }

  if (!text.includes(version)) {
    check.add(
      `${path}: release description must name version ${version}. The page title is the bare version, so the sentence has to carry it for search results and link previews.`,
    );
  }
  if (!/\bBondery\b/.test(text)) {
    check.add(
      `${path}: release description must name Bondery, because the page title is only a version number.`,
    );
  }
  if (isGeneratedSummary(text)) {
    check.add(
      `${path}: release description reads as a generated summary. Name the changes a reader would search for instead of counting them.`,
    );
  }

  checked += 1;
}

check.ok(`${checked} pages checked`);

if (warnings.length > 0) {
  console.warn(`\ncheck-docs-descriptions: ${warnings.length} warning(s)\n`);
  for (const warning of warnings) {
    console.warn(`  - ${warning}`);
  }
}
