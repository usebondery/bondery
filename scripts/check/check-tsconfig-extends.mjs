/**
 * Fail when a tsconfig skips a Bondery TypeScript preset.
 *
 * A `tsconfig*.json` that does not extend `@bondery/typescript-config/base.json` (or
 * `nextjs.json` / `react-library.json`) never receives the shared strict, unused, and
 * incremental flags. Copying those flags into each file looks equivalent until the preset
 * changes, and then each copy drifts. This check requires a real `extends` chain to a
 * preset so the flags stay in one place. It also fails a tsconfig that sets `allowJs` to
 * true, because that flag lives in `base.json` as false.
 *
 * `packages/typescript-config/base.json` is the root preset and is exempt.
 * `nextjs.json` and `react-library.json` must extend `./base.json`.
 *
 * Escape hatch: a comment in the tsconfig that uses the tracked exception marker from
 * `check-no-workarounds`. The issue owns removal of the exception.
 *
 * Usage: node scripts/check/check-tsconfig-extends.mjs
 *        (pnpm run check:tsconfig-extends)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { ALLOW_MARKER } from "./check-no-workarounds.mjs";
import { createCheck } from "./check-report.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

const SKIP_DIRS = new Set([
  ".cache",
  ".expo",
  ".next",
  ".wxt",
  "dist",
  "generated",
  "node_modules",
]);
const TSCONFIG_NAME = /^tsconfig.*\.json$/;

const PRESET_PREFIX = "@bondery/typescript-config/";
const PRESET_SPECIFIERS = new Set([
  `${PRESET_PREFIX}base.json`,
  `${PRESET_PREFIX}nextjs.json`,
  `${PRESET_PREFIX}react-library.json`,
]);

const ROOT_PRESET = "packages/typescript-config/base.json";
const NEXTJS_PRESET = "packages/typescript-config/nextjs.json";
const REACT_LIBRARY_PRESET = "packages/typescript-config/react-library.json";
const PRESET_PATHS = new Set([ROOT_PRESET, NEXTJS_PRESET, REACT_LIBRARY_PRESET]);

const EXTEND_PRESET_REMEDY =
  "Extend `@bondery/typescript-config/base.json`, `@bondery/typescript-config/nextjs.json`, or `@bondery/typescript-config/react-library.json`.";

/**
 * Repo-relative POSIX path for diagnostics and preset identity.
 *
 * @param {string} root
 * @param {string} filePath
 */
function toRepoPath(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

/**
 * Parse tsconfig JSONC: comments and trailing commas are allowed.
 *
 * @param {string} text
 * @returns {unknown}
 */
function parseTsconfigJsonc(text) {
  return asUnknown(JSON.parse(stripJsonc(text)));
}

/**
 * @param {unknown} config
 * @returns {boolean}
 */
function setsAllowJsTrue(config) {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return false;
  }
  const options = /** @type {{ compilerOptions?: { allowJs?: unknown } }} */ (config)
    .compilerOptions;
  return (
    options !== null &&
    typeof options === "object" &&
    !Array.isArray(options) &&
    options.allowJs === true
  );
}

/**
 * Every tsconfig under `apps/` and `packages/` that does not reach a Bondery preset.
 *
 * @param {string} root repo root, or a fixture that mirrors `apps/` and `packages/`
 * @returns {string[]}
 */
function findViolations(root) {
  const violations = [];
  for (const filePath of collectTsconfigFiles(root)) {
    const message = judgeTsconfig(root, filePath);
    if (message !== null) {
      violations.push(message);
    }
  }
  return violations;
}

/**
 * @param {string} root
 * @param {string} filePath
 * @returns {string | null}
 */
function judgeTsconfig(root, filePath) {
  const rel = toRepoPath(root, filePath);
  const text = readFileSync(filePath, "utf8");
  if (ALLOW_MARKER.test(text) || rel === ROOT_PRESET) {
    return null;
  }

  let config;
  try {
    config = parseTsconfigJsonc(text);
  } catch {
    return `${rel} is not valid JSONC. Fix the JSON so this check can read \`extends\`.`;
  }

  if (setsAllowJsTrue(config)) {
    return `${rel} sets \`allowJs\` to true. Remove \`allowJs\` from this file so \`packages/typescript-config/base.json\` keeps it false.`;
  }

  if (rel === NEXTJS_PRESET || rel === REACT_LIBRARY_PRESET) {
    if (extendsRootPreset(filePath, config, root)) {
      return null;
    }
    return `${rel} does not extend \`./base.json\`. Set \`extends\` to \`./base.json\`.`;
  }

  if (reachesPreset(root, filePath, new Set())) {
    return null;
  }
  return `${rel} does not extend a Bondery TypeScript preset. ${EXTEND_PRESET_REMEDY}`;
}

/**
 * Copy a JSON string literal starting at `start` (`"`).
 *
 * @param {string} text
 * @param {number} start index of the opening quote
 * @returns {{ chunk: string, next: number }}
 */
function copyJsonString(text, start) {
  let chunk = '"';
  let index = start + 1;
  while (index < text.length) {
    const inner = text[index];
    chunk += inner;
    if (inner === "\\") {
      chunk += text[index + 1] ?? "";
      index += 2;
      continue;
    }
    index += 1;
    if (inner === '"') {
      break;
    }
  }
  return { chunk, next: index };
}

/**
 * @param {string} text
 * @param {number} start index of the first `/` of `//`
 */
function skipLineComment(text, start) {
  let index = start;
  while (index < text.length && text[index] !== "\n") {
    index += 1;
  }
  return index;
}

/**
 * @param {string} text
 * @param {number} start index of the first `/` of `/*`
 */
function skipBlockComment(text, start) {
  let index = start + 2;
  while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
    index += 1;
  }
  return index + 2;
}

/**
 * @param {string} text
 */
function stripJsonc(text) {
  let result = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      const copied = copyJsonString(text, index);
      result += copied.chunk;
      index = copied.next;
      continue;
    }
    if (char === "/" && next === "/") {
      index = skipLineComment(text, index);
      continue;
    }
    if (char === "/" && next === "*") {
      index = skipBlockComment(text, index);
      continue;
    }
    result += char;
    index += 1;
  }
  return result.replace(/,(\s*[}\]])/g, "$1");
}

/**
 * @param {string} dir
 * @param {string[]} stack
 * @param {string[]} files
 */
function walkTsconfigDir(dir, stack, files) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        stack.push(fullPath);
      }
      continue;
    }
    if (entry.isFile() && TSCONFIG_NAME.test(entry.name)) {
      files.push(fullPath);
    }
  }
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function collectTsconfigFiles(root) {
  const files = [];
  const stack = [join(root, "apps"), join(root, "packages")];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir === undefined) {
      break;
    }
    walkTsconfigDir(dir, stack, files);
  }
  for (const name of ["base.json", "nextjs.json", "react-library.json"]) {
    const presetPath = join(root, "packages", "typescript-config", name);
    if (existsSync(presetPath)) {
      files.push(presetPath);
    }
  }
  return files;
}

/**
 * @param {unknown} config
 * @returns {string[]}
 */
function extendSpecifiers(config) {
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return [];
  }
  const value = /** @type {{ extends?: unknown }} */ (config).extends;
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string");
  }
  return [];
}

/**
 * @param {string} fromFile
 * @param {string} specifier
 * @param {string} root
 * @returns {string | null}
 */
function resolveExtends(fromFile, specifier, root) {
  if (specifier.startsWith(PRESET_PREFIX)) {
    return join(root, "packages", "typescript-config", specifier.slice(PRESET_PREFIX.length));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const withJson = specifier.endsWith(".json") ? specifier : `${specifier}.json`;
    return resolve(dirname(fromFile), withJson);
  }
  return null;
}

/**
 * True when `extends` names the root preset, directly or as a resolved path.
 *
 * @param {string} filePath
 * @param {unknown} config
 * @param {string} root
 */
function extendsRootPreset(filePath, config, root) {
  return extendSpecifiers(config).some((specifier) => {
    if (specifier === `${PRESET_PREFIX}base.json`) {
      return true;
    }
    const resolved = resolveExtends(filePath, specifier, root);
    return resolved !== null && toRepoPath(root, resolved) === ROOT_PRESET;
  });
}

/**
 * True when this file is a preset, or any `extends` ancestor is a preset.
 *
 * A missing vendor file is ignored. An array that also names a preset still passes.
 *
 * @param {string} root
 * @param {string} filePath
 * @param {Set<string>} visited
 */
function reachesPreset(root, filePath, visited) {
  const rel = toRepoPath(root, filePath);
  if (visited.has(rel)) {
    return false;
  }
  visited.add(rel);
  if (PRESET_PATHS.has(rel)) {
    return true;
  }

  let config;
  try {
    config = parseTsconfigJsonc(readFileSync(filePath, "utf8"));
  } catch {
    return false;
  }

  for (const specifier of extendSpecifiers(config)) {
    if (PRESET_SPECIFIERS.has(specifier)) {
      return true;
    }
    const resolved = resolveExtends(filePath, specifier, root);
    if (resolved === null) {
      continue;
    }
    if (PRESET_PATHS.has(toRepoPath(root, resolved))) {
      return true;
    }
    if (existsSync(resolved) && reachesPreset(root, resolved, visited)) {
      return true;
    }
  }
  return false;
}

function main() {
  const check = createCheck("check-tsconfig-extends");
  for (const message of findViolations(ROOT)) {
    // Each message already names the file and the preset to extend.
    check.add(message); // diagnostic-message: remedy-in-value findViolations()
  }
  check.ok();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { findViolations };
