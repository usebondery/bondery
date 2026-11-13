#!/usr/bin/env node
/**
 * Write a JSON file in the repository's own formatting.
 *
 * `JSON.stringify(value, null, 2)` and Biome do not agree. Biome keeps a short
 * array on one line (`"sizes": ["any"]`), and `JSON.stringify` always expands it.
 * A generator that writes with `JSON.stringify` alone therefore produces a file
 * that `biome ci` immediately rejects, so `pnpm check` fails on a later run with
 * a diff the generator created and never saw.
 *
 * Route every committed JSON write through here. The file lands formatted, so a
 * generator cannot hand the next `pnpm check` a broken tree.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);

/** Resolve the same Biome binary the pre-commit hook uses, so one version formats everything. */
function resolveBiomeBin() {
  return require.resolve("@biomejs/biome/bin/biome");
}

/**
 * Serialize, write, then format in place.
 *
 * Biome rewrites the file only when its formatting differs, so a second call
 * with unchanged content leaves the file untouched and its mtime stable.
 *
 * @param {string} absPath Absolute path of the file to write.
 * @param {unknown} value Value to serialize as JSON.
 * @param {{ cwd: string }} options `cwd` must contain the repo `biome.json`.
 */
export function writeFormattedJson(absPath, value, { cwd }) {
  writeFileSync(absPath, `${JSON.stringify(value, null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [
      resolveBiomeBin(),
      "format",
      "--write",
      "--files-ignore-unknown=true",
      "--no-errors-on-unmatched",
      absPath,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(
      `writeFormattedJson: Biome failed to format ${absPath}${detail ? `\n${detail}` : ""}`,
    );
  }
}

/**
 * Format an already written file.
 *
 * Use this for a generator that rewrites JSON through a path this helper cannot
 * own, such as a parser round-trip. Prefer `writeFormattedJson`.
 *
 * @param {string} absPath Absolute path of an existing file.
 * @param {{ cwd: string }} options `cwd` must contain the repo `biome.json`.
 */
export function formatWrittenJson(absPath, { cwd }) {
  const result = spawnSync(
    process.execPath,
    [
      resolveBiomeBin(),
      "format",
      "--write",
      "--files-ignore-unknown=true",
      "--no-errors-on-unmatched",
      absPath,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(
      `formatWrittenJson: Biome failed to format ${absPath}${detail ? `\n${detail}` : ""}`,
    );
  }
}

/** Convenience for a path relative to the repo root. */
export function repoPath(root, relPath) {
  return join(root, relPath);
}

/**
 * Format several already written files in one Biome run.
 *
 * Generators that touch many files should collect the paths and call this once,
 * rather than spawning Biome per file. Formatting runs even when a generator
 * changed nothing, so a file left misformatted by an earlier run is repaired
 * instead of persisting until the next content change.
 *
 * @param {string[]} absPaths Absolute paths of existing files.
 * @param {{ cwd: string }} options `cwd` must contain the repo `biome.json`.
 */
export function formatWrittenFiles(absPaths, { cwd }) {
  if (absPaths.length === 0) {
    return;
  }

  const result = spawnSync(
    process.execPath,
    [
      resolveBiomeBin(),
      "format",
      "--write",
      "--files-ignore-unknown=true",
      "--no-errors-on-unmatched",
      ...absPaths,
    ],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw new Error(
      `formatWrittenFiles: Biome failed on ${absPaths.length} file(s)${detail ? `\n${detail}` : ""}`,
    );
  }
}
