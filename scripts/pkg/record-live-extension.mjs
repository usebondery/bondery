#!/usr/bin/env node
/**
 * Records the extension version that is live in the Chrome Web Store, after a release shipped it.
 * `sync-version` derives MIN_EXTENSION_VERSION from this record, so MIN can never rise above what
 * users can install. Run it once the listing is live, then run `pnpm run sync-version`.
 *
 *   pnpm run release:record-extension -- 1.11.5
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCalver } from "./calver.mjs";
import { writeFormattedJson } from "./write-formatted-json.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RECORD = join(root, "scripts/pkg/live-extension-version.json");
const PRODUCTION_RE = /^\d+\.\d+\.\d+$/;

function main() {
  const version = process.argv[2]?.trim() ?? "";
  if (!PRODUCTION_RE.test(version)) {
    console.error("Usage: record-live-extension.mjs X.Y.Z (a production version, not an RC)");
    return 1;
  }
  parseCalver(version);
  const current = JSON.parse(readFileSync(RECORD, "utf8")).version;
  if (current === version) {
    console.log(`Live extension version is already ${version}`);
    return 0;
  }
  writeFormattedJson(RECORD, { version }, { cwd: root });
  console.log(
    `Recorded live extension version ${version} (was ${current}). Run pnpm run sync-version.`,
  );
  return 0;
}

process.exitCode = main();
