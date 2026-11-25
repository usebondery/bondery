#!/usr/bin/env node
/**
 * Changelog helper for cutting a release.
 *
 * It does the mechanical part of "When cutting a release" in
 * references/versioning-and-release.md, so no one edits four files by hand:
 *
 *   next-version  Print the next calendar version for a date (default: today).
 *   status        Print what `Unreleased` holds: entries per category, and Breaking.
 *   cut           Move `Unreleased` into docs/changelog/X.Y.Z.mdx, prepend X.Y.Z to
 *                 docs/changelog/meta.json, and reset docs/changelog/unreleased.mdx.
 *
 * It never writes prose. The `description` comes from you, because it must name the
 * changes a reader would search for (140 to 160 characters, starts with "Bondery X.Y.Z").
 *
 * Usage (from the repo root):
 *   node .agents/skills/bondery-changelog/scripts/changelog.mjs next-version [--date YYYY-MM-DD]
 *   node .agents/skills/bondery-changelog/scripts/changelog.mjs status
 *   node .agents/skills/bondery-changelog/scripts/changelog.mjs cut X.Y.Z --description "…" \
 *     [--date YYYY-MM-DD] [--dry-run]
 *
 * Prerequisites: Node 20 or newer. No network, no secrets.
 * Exit codes: 0 done, 1 refused (bad input or nothing to cut), 2 usage error.
 * Idempotent: `cut` refuses to run twice for one version, and `--dry-run` writes nothing.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const CALENDAR_YEAR_OFFSET = 2025;
const MIN_DESCRIPTION_LENGTH = 140;
const MAX_DESCRIPTION_LENGTH = 160;

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const RELEASE_FILE_RE = /^(\d+)\.(\d+)\.(\d+)\.mdx$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UNRELEASED_HEADING_RE = /^## \[Unreleased\][ \t]*$/m;
const CATEGORY_HEADING_RE = /^### (.+?)[ \t]*$/gm;
const BULLET_RE = /^- /gm;
const OUTER_WHITESPACE_RE = /^\s+|\s+$/g;
const LAST_UPDATED_RE = /^last_updated: .*$/m;
const MDX_EXTENSION_RE = /\.mdx$/;
const NEEDS_YAML_QUOTES_RE = /(?:^[\s!&*[\]{}|>'"%@`#,-])|(?::\s)|(?:\s#)|(?:\s$)/;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "../../../..");

class ChangelogError extends Error {}

/** @param {string} root */
function paths(root) {
  const dir = join(root, "docs", "changelog");
  return {
    dir,
    meta: join(dir, "meta.json"),
    unreleased: join(dir, "unreleased.mdx"),
  };
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @returns {{ year: number; month: number; day: number }}
 */
function parseIsoDate(isoDate) {
  const match = ISO_DATE_RE.exec(isoDate);
  if (!match) {
    throw new ChangelogError(`Date must be YYYY-MM-DD (got "${isoDate}").`);
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new ChangelogError(`"${isoDate}" is not a real date.`);
  }
  return { day, month, year };
}

/** @param {Date} date Local date, as an ISO string. */
function isoDateOf(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Next calendar version for the month of `isoDate`: X is the year offset from 2025, Y the month,
 * and Z one more than the highest patch already released that month (0 for the first).
 * @param {string[]} releasedVersions Versions that already have a page, such as "1.11.4".
 * @param {string} isoDate
 */
function nextVersion(releasedVersions, isoDate) {
  const { month, year } = parseIsoDate(isoDate);
  const major = year - CALENDAR_YEAR_OFFSET;
  if (major < 1) {
    throw new ChangelogError(
      `${year} is before the first calendar year (${CALENDAR_YEAR_OFFSET}).`,
    );
  }
  let highest = -1;
  for (const version of releasedVersions) {
    const match = VERSION_RE.exec(version);
    if (match && Number(match[1]) === major && Number(match[2]) === month) {
      highest = Math.max(highest, Number(match[3]));
    }
  }
  return `${major}.${month}.${highest + 1}`;
}

/** @param {string} dir docs/changelog */
function releasedVersionsIn(dir) {
  return readdirSync(dir)
    .filter((name) => RELEASE_FILE_RE.test(name))
    .map((name) => name.replace(MDX_EXTENSION_RE, ""));
}

/**
 * Splits `unreleased.mdx` into the text before the heading and the entries after it.
 * @param {string} source
 */
function splitUnreleased(source) {
  const heading = UNRELEASED_HEADING_RE.exec(source);
  if (!heading) {
    throw new ChangelogError("unreleased.mdx has no `## [Unreleased]` heading.");
  }
  const end = heading.index + heading[0].length;
  return {
    body: source.slice(end).replace(OUTER_WHITESPACE_RE, ""),
    head: source.slice(0, end),
  };
}

/**
 * What `Unreleased` holds: bullets per category heading.
 * @param {string} body
 * @returns {{ category: string; entries: number }[]}
 */
function summarize(body) {
  const headings = [...body.matchAll(CATEGORY_HEADING_RE)];
  return headings.map((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    return {
      category: heading[1] ?? "",
      entries: (body.slice(start, end).match(BULLET_RE) ?? []).length,
    };
  });
}

/**
 * Throws unless `description` is a valid release description (format.md#release-page-description).
 * @param {string} description
 * @param {string} version
 */
function assertDescription(description, version) {
  const { length } = description;
  if (length < MIN_DESCRIPTION_LENGTH || length > MAX_DESCRIPTION_LENGTH) {
    throw new ChangelogError(
      `The description is ${length} characters; it must be ${MIN_DESCRIPTION_LENGTH} to ${MAX_DESCRIPTION_LENGTH}.`,
    );
  }
  if (!description.startsWith(`Bondery ${version}`)) {
    throw new ChangelogError(`The description must start with "Bondery ${version}".`);
  }
  if (description.includes("\n")) {
    throw new ChangelogError("The description must be one line.");
  }
}

/** A plain YAML scalar when it is safe, otherwise a JSON (so YAML double-quoted) string. */
function yamlScalar(value) {
  return NEEDS_YAML_QUOTES_RE.test(value) ? JSON.stringify(value) : value;
}

/** @param {string} isoDate */
function dottedDate(isoDate) {
  const { day, month, year } = parseIsoDate(isoDate);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(day)}.${pad(month)}.${year}`;
}

/**
 * The text of every file `cut` writes. Pure, so it is testable without a repository.
 * @param {{
 *   body: string;
 *   description: string;
 *   isoDate: string;
 *   meta: { pages: string[] } & Record<string, unknown>;
 *   unreleasedHead: string;
 *   version: string;
 * }} input
 */
function planCut({ body, description, isoDate, meta, unreleasedHead, version }) {
  if (!VERSION_RE.test(version)) {
    throw new ChangelogError(
      `"${version}" is not a clean calendar version (X.Y.Z). Release candidates have no changelog page.`,
    );
  }
  if (meta.pages.includes(version)) {
    throw new ChangelogError(`${version} is already in meta.json.`);
  }
  if (body.length === 0) {
    throw new ChangelogError(
      "`Unreleased` is empty; there is nothing to cut. Add entries first (format.md).",
    );
  }
  assertDescription(description, version);

  const release = [
    "---",
    `title: "${version}"`,
    `description: ${yamlScalar(description)}`,
    `last_updated: ${isoDate}`,
    "---",
    "",
    `## [${version}] - ${dottedDate(isoDate)}`,
    "",
    body,
    "",
  ].join("\n");

  const head = unreleasedHead.replace(LAST_UPDATED_RE, `last_updated: ${isoDate}`);
  return {
    meta: `${JSON.stringify({ ...meta, pages: [version, ...meta.pages] }, null, 2)}\n`,
    release,
    unreleased: `${head}\n`,
  };
}

/**
 * @param {string} root Repository root.
 * @param {{ description: string; isoDate: string; dryRun: boolean; version: string }} options
 */
function cut(root, { description, dryRun, isoDate, version }) {
  const where = paths(root);
  const releaseFile = join(where.dir, `${version}.mdx`);
  if (existsSync(releaseFile)) {
    throw new ChangelogError(`${releaseFile} already exists.`);
  }
  const { body, head } = splitUnreleased(readFileSync(where.unreleased, "utf8"));
  const plan = planCut({
    body,
    description,
    isoDate,
    meta: JSON.parse(readFileSync(where.meta, "utf8")),
    unreleasedHead: head,
    version,
  });
  if (!dryRun) {
    writeFileSync(releaseFile, plan.release, "utf8");
    writeFileSync(where.meta, plan.meta, "utf8");
    writeFileSync(where.unreleased, plan.unreleased, "utf8");
  }
  return { plan, releaseFile };
}

/**
 * @param {string[]} args
 * @returns {{ options: { date?: string; description?: string; dryRun: boolean }; positional: string[] }}
 */
function parseArgs(args) {
  const values = new Map();
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "--dry-run") {
      values.set("dry-run", "true");
    } else if (arg === "--date" || arg === "--description") {
      const value = args[index + 1];
      if (value === undefined) {
        throw new ChangelogError(`${arg} needs a value.`);
      }
      values.set(arg.slice(2), value);
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new ChangelogError(`Unknown option ${arg}.`);
    } else {
      positional.push(arg);
    }
  }
  return {
    options: {
      date: values.get("date"),
      description: values.get("description"),
      dryRun: values.has("dry-run"),
    },
    positional,
  };
}

const USAGE = `Usage:
  changelog.mjs next-version [--date YYYY-MM-DD]
  changelog.mjs status
  changelog.mjs cut X.Y.Z --description "Bondery X.Y.Z …" [--date YYYY-MM-DD] [--dry-run]`;

/**
 * @param {string[]} argv
 * @param {{ root?: string; now?: Date; log?: (line: string) => void; fail?: (line: string) => void }} [context]
 * @returns {number} Exit code.
 */
function main(
  argv,
  { fail = console.error, log = console.log, now = new Date(), root = defaultRepoRoot } = {},
) {
  const [command, ...rest] = argv;
  try {
    const { options, positional } = parseArgs(rest);
    const where = paths(root);
    const isoDate = options.date ?? isoDateOf(now);

    if (command === "next-version") {
      log(nextVersion(releasedVersionsIn(where.dir), isoDate));
      return 0;
    }

    if (command === "status") {
      const { body } = splitUnreleased(readFileSync(where.unreleased, "utf8"));
      const categories = summarize(body);
      if (categories.length === 0) {
        log("Unreleased is empty.");
        return 0;
      }
      for (const { category, entries } of categories) {
        log(`${entries}\t${category}`);
      }
      log(`Next version for ${isoDate}: ${nextVersion(releasedVersionsIn(where.dir), isoDate)}`);
      return 0;
    }

    if (command === "cut") {
      const [version] = positional;
      if (!version || options.description === undefined) {
        log(USAGE);
        return 2;
      }
      const { releaseFile } = cut(root, {
        description: options.description,
        dryRun: options.dryRun,
        isoDate,
        version,
      });
      log(
        options.dryRun
          ? `Dry run: would write ${releaseFile}, prepend ${version} to meta.json, and reset unreleased.mdx.`
          : `Cut ${version}: wrote ${releaseFile}, prepended it to meta.json, and reset unreleased.mdx.`,
      );
      log("Next: pnpm run sync-version, then pnpm run check:docs (see bondery-release).");
      return 0;
    }

    log(USAGE);
    return 2;
  } catch (error) {
    if (error instanceof ChangelogError) {
      fail(`changelog: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}

export {
  assertDescription,
  cut,
  isoDateOf,
  main,
  nextVersion,
  parseIsoDate,
  planCut,
  releasedVersionsIn,
  splitUnreleased,
  summarize,
};
