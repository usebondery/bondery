#!/usr/bin/env node
/**
 * Release guard: MIN_EXTENSION_VERSION must never exceed the extension version that users can
 * install. The API answers 426 to an extension below MIN, so a MIN above the live Chrome Web
 * Store version locks out every installed extension.
 *
 * "Live" here is the newest published GitHub release: not a draft, not a prerelease. A release
 * stays a draft until every component, the extension included, has shipped, and a git tag alone
 * proves nothing (v1.11.3 was tagged and never shipped).
 *
 * Two checks:
 * - the checked-in record (scripts/pkg/live-extension-version.json) is not above that release,
 *   because the record is what `sync-version` derives MIN from;
 * - MIN_EXTENSION_VERSION is not above that release.
 *
 *   node scripts/check/check-min-extension-version.mjs            # asks GitHub through `gh`
 *   node scripts/check/check-min-extension-version.mjs --offline  # record and MIN only
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PRODUCTION_TAG_RE = /^v(\d+)\.(\d+)\.(\d+)$/;
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const MIN_EXTENSION_VERSION_RE = /export const MIN_EXTENSION_VERSION: string = "([^"]*)";/;

/**
 * @param {string} version X.Y.Z
 * @returns {[number, number, number]}
 */
function parseTriple(version) {
  const match = VERSION_RE.exec(version);
  if (!match) {
    throw new Error(`Not a 3-part version: ${version}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Negative when `left` is below `right`, 0 when equal, positive when above. */
function compareTriples(left, right) {
  const a = parseTriple(left);
  const b = parseTriple(right);
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * The newest published production release.
 * @param {ReadonlyArray<{ tagName: string; isDraft: boolean; isPrerelease: boolean }>} releases
 * @returns {string | undefined} X.Y.Z, or undefined when none is published
 */
function newestPublishedVersion(releases) {
  const versions = releases
    .filter((release) => !(release.isDraft || release.isPrerelease))
    .filter((release) => PRODUCTION_TAG_RE.test(release.tagName))
    .map((release) => release.tagName.slice(1));
  versions.sort((left, right) => compareTriples(right, left));
  return versions[0];
}

/**
 * What is wrong with MIN and the record, given the published releases.
 * @param {{ min: string; record: string; releases: Parameters<typeof newestPublishedVersion>[0] }} input
 * @returns {string[]}
 */
function minExtensionFailures({ min, record, releases }) {
  const live = newestPublishedVersion(releases);
  if (!live) {
    return ["No published GitHub release found, so the live extension version is unknown."];
  }
  const failures = [];
  if (compareTriples(record, live) > 0) {
    failures.push(
      `scripts/pkg/live-extension-version.json says ${record}, above the newest published release ${live}.`,
    );
  }
  if (compareTriples(min, live) > 0) {
    failures.push(
      `MIN_EXTENSION_VERSION ${min} is above the newest published release ${live}. Every installed extension would get 426.`,
    );
  }
  return failures;
}

function readRepoState(root) {
  const record = JSON.parse(
    readFileSync(join(root, "scripts/pkg/live-extension-version.json"), "utf8"),
  ).version;
  const paths = readFileSync(join(root, "packages/helpers/src/globals/paths.ts"), "utf8");
  const min = MIN_EXTENSION_VERSION_RE.exec(paths)?.[1];
  if (!min) {
    throw new Error(
      "Could not find MIN_EXTENSION_VERSION in packages/helpers/src/globals/paths.ts",
    );
  }
  return { min, record };
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const { min, record } = readRepoState(root);

  if (process.argv.includes("--offline")) {
    const failures =
      compareTriples(min, record) > 0
        ? [`MIN_EXTENSION_VERSION ${min} is above the recorded live version ${record}.`]
        : [];
    return report(failures, `MIN ${min} <= recorded live ${record}`);
  }

  const releases = JSON.parse(
    execFileSync(
      "gh",
      ["release", "list", "--limit", "100", "--json", "tagName,isDraft,isPrerelease"],
      { encoding: "utf8" },
    ),
  );
  const live = newestPublishedVersion(releases);
  return report(minExtensionFailures({ min, record, releases }), `MIN ${min} <= live ${live}`);
}

function report(failures, okMessage) {
  if (failures.length === 0) {
    console.log(`check-min-extension-version: ${okMessage}`);
    return 0;
  }
  for (const failure of failures) {
    console.error(`check-min-extension-version: ${failure}`);
  }
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}

export { compareTriples, minExtensionFailures, newestPublishedVersion };
