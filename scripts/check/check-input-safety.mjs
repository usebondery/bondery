/**
 * Fail CI when untrusted input can reach storage or the DOM without its guard.
 *
 * Biome plugins (`biome/plugins/`) own the per-call rules: no multipart read without a size cap,
 * no string written as HTML. This script owns what spans files and needs a project-wide view:
 *
 * 1. Notes writes. Contact notes are stored as HTML. Every API module that writes `notes` into a
 *    `people` row must pass the value through `sanitizeNotesHtml`, or a stored `<script>` or
 *    `javascript:` link reaches every client, export, and email that later renders it.
 * 2. The global multipart ceiling. `build-app.ts` must register `@fastify/multipart` with
 *    `UPLOAD_LIMITS.default`, and that default must stay small. A literal there (the old
 *    `100 * 1024 * 1024`) silently lets every upload route accept 100 MB.
 *
 * Reads source text only: no build, no database, no browser.
 *
 * Usage: node scripts/check/check-input-safety.mjs
 *        (pnpm run check:input-safety)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCheck } from "./check-report.mjs";

const PATTERN_5E5C642B285C_RE = /^\d+(?<group1>\.\d+)?$/u;
const REGISTER_MULTIPART_RE = /register\(\s*multipart\s*,\s*\{(?<group1>[\s\S]*?)\}\s*\)/u;
const FILESIZE_UPLOAD_LIMITS_DEFAULT_RE = /fileSize\s*:\s*UPLOAD_LIMITS\.default\b/u;
const BDEFAULT_RE = /\bdefault\s*:\s*(?<group1>[\w\s*]+?)\s*,/u;

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

/** Largest global multipart ceiling allowed. Routes that need more name their own cap. */
const MAX_DEFAULT_UPLOAD_BYTES = 10 * 1024 * 1024;

/** A Prisma write on the people table. */
const PEOPLE_WRITE =
  /\b(?:people|person)\s*\.\s*(?:create|createMany|createManyAndReturn|update|updateMany|upsert)\s*\(/u;

/** `notes:` or `notes =` that sets a value. `notes: true` is a select, not a write. */
const NOTES_ASSIGNMENT = /\bnotes\s*[:=]\s*(?!true\b|false\b)/u;

/** Raw SQL that sets the notes column. */
const NOTES_RAW_SQL = /\bSET\b[^;`]*\bnotes\b\s*=/iu;

const SANITIZER = "sanitizeNotesHtml";

/**
 * Reads `const NAME = 5;` and `const NAME = A * B;` lines, so a size written with named units
 * (`DEFAULT_UPLOAD_MIB * BYTES_PER_MIB`) can be evaluated.
 *
 * @param {string} text source of a module
 * @returns {Map<string, string>} constant name to its product expression
 */
function readNumericConstants(text) {
  const constants = new Map();
  for (const match of text.matchAll(
    /^(?:export\s+)?const\s+(?<group1>\w+)\s*=\s*(?<group2>[\w\s*]+?);/gmu,
  )) {
    constants.set(match[1], match[2]);
  }
  return constants;
}

/**
 * Evaluates `A * B * 3` where each factor is a number or a name from `constants`.
 *
 * @param {string} expression product of factors
 * @param {Map<string, string>} constants name to product expression
 * @param {Set<string>} seen names being resolved, to stop a cycle
 * @returns {number} the product, or NaN when a name cannot be resolved
 */
function evaluateProduct(expression, constants, seen = new Set()) {
  let product = 1;
  for (const part of expression.split("*")) {
    const term = part.trim();
    if (PATTERN_5E5C642B285C_RE.test(term)) {
      product *= Number(term);
      continue;
    }
    const definition = constants.get(term);
    if (definition === undefined || seen.has(term)) {
      return Number.NaN;
    }
    product *= evaluateProduct(definition, constants, new Set([...seen, term]));
  }
  return product;
}

function repoPath(filePath) {
  return relative(repoRoot, filePath).split(sep).join("/");
}

function collectSource(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSource(full, acc);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts") && !entry.endsWith(".d.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  const check = createCheck("check-input-safety");
  const apiSrc = join(repoRoot, "apps", "api", "src");

  const files = collectSource(apiSrc).map((file) => ({
    path: repoPath(file),
    text: readFileSync(file, "utf8"),
  }));
  for (const message of findUnsanitizedNotesWriters(files)) {
    check.add(message);
  }

  const buildApp = readFileSync(join(apiSrc, "build-app.ts"), "utf8");
  const config = readFileSync(join(apiSrc, "lib", "platform", "config.ts"), "utf8");
  for (const message of findMultipartCeilingViolations(buildApp, config)) {
    check.add(message);
  }

  check.ok(`${files.length} API modules scanned`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

/**
 * API modules that write notes into `people` without calling the sanitizer.
 *
 * @param {{ path: string, text: string }[]} files API source files (tests excluded)
 * @returns {string[]} one message per offending file
 */
export function findUnsanitizedNotesWriters(files) {
  const violations = [];
  for (const { path, text } of files) {
    const writesPeople = PEOPLE_WRITE.test(text) && NOTES_ASSIGNMENT.test(text);
    const writesRaw = NOTES_RAW_SQL.test(text);
    if ((writesPeople || writesRaw) && !text.includes(SANITIZER)) {
      violations.push(
        `${path} writes contact notes but never calls ${SANITIZER}(). Stored notes are HTML: sanitize before every write (apps/api/src/lib/notes/sanitize-notes-html.ts).`,
      );
    }
  }
  return violations;
}

/**
 * The multipart registration in `build-app.ts` must use the small shared default.
 *
 * @param {string} buildAppText source of `apps/api/src/build-app.ts`
 * @param {string} configText source of `apps/api/src/lib/platform/config.ts`
 * @returns {string[]} one message per problem
 */
export function findMultipartCeilingViolations(buildAppText, configText) {
  const violations = [];
  const registration = buildAppText.match(REGISTER_MULTIPART_RE);
  if (!registration) {
    violations.push(
      "apps/api/src/build-app.ts: could not find `register(multipart, { … })`. Update this check if the registration moved.",
    );
  } else if (!FILESIZE_UPLOAD_LIMITS_DEFAULT_RE.test(registration[1])) {
    violations.push(
      "apps/api/src/build-app.ts: multipart `fileSize` must be `UPLOAD_LIMITS.default`, not a literal. A route that needs a bigger file declares its own cap in UPLOAD_LIMITS.",
    );
  }

  const defaultMatch = configText.match(BDEFAULT_RE);
  if (!defaultMatch) {
    violations.push(
      "apps/api/src/lib/platform/config.ts: could not read `UPLOAD_LIMITS.default` as a number expression.",
    );
  } else {
    const bytes = evaluateProduct(defaultMatch[1], readNumericConstants(configText));
    if (!Number.isFinite(bytes) || bytes > MAX_DEFAULT_UPLOAD_BYTES) {
      violations.push(
        `apps/api/src/lib/platform/config.ts: UPLOAD_LIMITS.default is ${bytes} bytes. Keep the global ceiling at or below ${MAX_DEFAULT_UPLOAD_BYTES} bytes.`,
      );
    }
  }
  return violations;
}

export { MAX_DEFAULT_UPLOAD_BYTES };
