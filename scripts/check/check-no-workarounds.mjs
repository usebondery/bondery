/**
 * Reject stopgap wording in new code and commit messages.
 *
 * Words like "workaround", "hack" and "for now" mark a known defect that was left in place.
 * Agents and people both reach for them when a root cause is hard to find. This check makes
 * the shortcut visible and costly, so the root cause gets fixed instead.
 *
 * Only ADDED lines are checked, so existing text never blocks an unrelated change.
 *
 * A real, unavoidable stopgap is allowed with a tracked exception: put
 * `allow-workaround(#123)` (or a full issue URL) on the same line or the line above. The
 * issue owns removing it. An exception without an issue reference does not count.
 *
 * Usage:
 *   node scripts/check/check-no-workarounds.mjs --staged            # pre-commit
 *   node scripts/check/check-no-workarounds.mjs --base origin/main  # CI and `pnpm run check`
 *   node scripts/check/check-no-workarounds.mjs --worktree origin/main  # committed, staged, unstaged and new files
 *   node scripts/check/check-no-workarounds.mjs --commit-msg <file> # commit-msg hook
 *   node scripts/check/check-no-workarounds.mjs --commits origin/main..HEAD
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCheck } from "./check-report.mjs";

const PATTERN_5C2B285C642B_RE = /\+(?<group1>\d+)/u;

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

/** Wording that marks a defect left in place. Each entry explains what to do instead. */
const BANNED = [
  { label: "workaround", pattern: /\bwork[\s-]?arounds?\b/iu },
  { label: "hack", pattern: /\bhack(?:s|y|ed)?\b/iu },
  { label: "kludge", pattern: /\bkludge\b/iu },
  { label: "band-aid", pattern: /\bband[\s-]?aid\b/iu },
  { label: "for now", pattern: /\bfor now\b/iu },
  { label: "temporary fix", pattern: /\btemporary (?:fix|solution|measure)\b/iu },
  { label: "quick and dirty", pattern: /\bquick[\s-]and[\s-]dirty\b/iu },
];

/** A tracked exception: the marker plus an issue number or URL. */
const ALLOW_MARKER = /allow-workaround\((?<group1>#\d+|https?:\/\/[^\s)]+)\)/iu;
/** The bare marker, removed before matching so its own name is not reported. */
const ALLOW_MARKER_ANY = /allow-workaround\([^)]*\)/giu;
/** This check's own name, as it appears in hook, CI and script wiring. */
const OWN_NAME = /no-workarounds/giu;

/** Code and config only. Prose docs and agent guidance legitimately discuss these words. */
const CHECKED_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts|yml|yaml|prisma|sql|sh)$/u;
const EXCLUDED_PATHS = [
  /(?:^|\/)node_modules\//u,
  /(?:^|\/)dist\//u,
  /(?:^|\/)\.next\//u,
  /(?:^|\/)generated\//u,
  /\.d\.[cm]?ts$/u,
  /^docs\//u,
  /^\.agents\//u,
  /^\.claude\//u,
  /^\.cursor\//u,
  /^llm-plugins\//u,
  /^scripts\/check\/check-no-workarounds\./u,
];

function isCheckedPath(path) {
  return CHECKED_EXTENSIONS.test(path) && EXCLUDED_PATHS.every((rule) => !rule.test(path));
}

/**
 * @param {{ path: string, line: number, text: string }[]} addedLines in file order
 * @returns {string[]} one message per violation
 */
function findViolations(addedLines) {
  const violations = [];
  let previous = null;
  for (const entry of addedLines) {
    const adjacent =
      previous !== null && previous.path === entry.path && previous.line === entry.line - 1;
    const excepted =
      ALLOW_MARKER.test(entry.text) || (adjacent && ALLOW_MARKER.test(previous.text));
    const scanned = entry.text.replace(ALLOW_MARKER_ANY, "").replace(OWN_NAME, "");
    if (!excepted) {
      for (const rule of BANNED) {
        if (rule.pattern.test(scanned)) {
          violations.push(
            `${entry.path}:${entry.line} uses "${rule.label}". Fix the root cause. If a stopgap is unavoidable, open an issue and add allow-workaround(#<issue>) on this line.`,
          );
          break;
        }
      }
    }
    previous = entry;
  }
  return violations;
}

/** Parse `git diff -U0` output into added lines with their new line numbers. */
function parseAddedLines(diff) {
  const added = [];
  let path = null;
  let line = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      path = raw === "+++ /dev/null" ? null : raw.slice(6);
    } else if (raw.startsWith("@@")) {
      const match = PATTERN_5C2B285C642B_RE.exec(raw);
      line = match ? Number(match[1]) : 0;
    } else if (raw.startsWith("+") && path !== null) {
      added.push({ line, path, text: raw.slice(1) });
      line += 1;
    }
  }
  return added.filter((entry) => isCheckedPath(entry.path));
}

/** Message lines that count: not git comments, and not generated trailers. */
function messageLines(message) {
  return message
    .split("\n")
    .filter((text) => !text.startsWith("#"))
    .map((text, index) => ({ line: index + 1, path: "commit message", text }));
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

/** Untracked files count as fully added, so a brand-new file is scanned too. */
function untrackedAddedLines() {
  const names = git(["ls-files", "--others", "--exclude-standard"])
    .split(String.fromCharCode(10))
    .filter(Boolean);
  return names.filter(isCheckedPath).flatMap((path) =>
    readFileSync(join(ROOT, path), "utf8")
      .split(String.fromCharCode(10))
      .map((text, index) => ({ line: index + 1, path, text })),
  );
}

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

function main() {
  const check = createCheck("check-no-workarounds");

  const commitMsgFile = argValue("--commit-msg");
  const commitRange = argValue("--commits");
  const baseRef = argValue("--base");
  const worktreeBase = argValue("--worktree");

  if (commitMsgFile) {
    check.violations.push(...findViolations(messageLines(readFileSync(commitMsgFile, "utf8"))));
    check.ok("commit message");
    return;
  }

  if (commitRange) {
    const log = git(["log", "--no-merges", "--format=%H%x00%B%x01", commitRange]);
    for (const record of log.split("\x01")) {
      const [sha, body] = record.trim().split("\x00");
      if (sha && body) {
        for (const message of findViolations(messageLines(body))) {
          // The violation text already ends with the remedy, so this prefix only names the commit.
          check.add(`${sha.slice(0, 8)}: ${message}`); // diagnostic-message: remedy-in-value findViolations()
        }
      }
    }
    check.ok(`commits ${commitRange}`);
    return;
  }

  if (worktreeBase) {
    const mergeBase = git(["merge-base", "HEAD", worktreeBase]).trim();
    const diff = git(["diff", "-U0", "--no-color", mergeBase]);
    for (const message of findViolations([...parseAddedLines(diff), ...untrackedAddedLines()])) {
      // The violation text already ends with the remedy, so nothing is added here.
      check.add(message); // diagnostic-message: remedy-in-value findViolations()
    }
    check.ok(`working tree against ${worktreeBase}`);
    return;
  }

  const diff = baseRef
    ? git(["diff", "-U0", "--no-color", `${baseRef}...HEAD`])
    : git(["diff", "--cached", "-U0", "--no-color"]);
  for (const message of findViolations(parseAddedLines(diff))) {
    check.add(message);
  }
  check.ok(baseRef ? `diff against ${baseRef}` : "staged changes");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { ALLOW_MARKER, BANNED, findViolations, isCheckedPath, messageLines, parseAddedLines };
