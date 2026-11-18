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

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

/** Largest global multipart ceiling allowed. Routes that need more name their own cap. */
export const MAX_DEFAULT_UPLOAD_BYTES = 10 * 1024 * 1024;

/** A Prisma write on the people table. */
const PEOPLE_WRITE =
  /\b(?:people|person)\s*\.\s*(?:create|createMany|createManyAndReturn|update|updateMany|upsert)\s*\(/;

/** `notes:` or `notes =` that sets a value. `notes: true` is a select, not a write. */
const NOTES_ASSIGNMENT = /\bnotes\s*[:=]\s*(?!true\b|false\b)/;

/** Raw SQL that sets the notes column. */
const NOTES_RAW_SQL = /\bSET\b[^;`]*\bnotes\b\s*=/i;

const SANITIZER = "sanitizeNotesHtml";

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
  const registration = buildAppText.match(/register\(\s*multipart\s*,\s*\{([\s\S]*?)\}\s*\)/);
  if (!registration) {
    violations.push(
      "apps/api/src/build-app.ts: could not find `register(multipart, { … })`. Update this check if the registration moved.",
    );
  } else if (!/fileSize\s*:\s*UPLOAD_LIMITS\.default\b/.test(registration[1])) {
    violations.push(
      "apps/api/src/build-app.ts: multipart `fileSize` must be `UPLOAD_LIMITS.default`, not a literal. A route that needs a bigger file declares its own cap in UPLOAD_LIMITS.",
    );
  }

  const defaultMatch = configText.match(/\bdefault\s*:\s*([\d\s*]+?)\s*,/);
  if (!defaultMatch) {
    violations.push(
      "apps/api/src/lib/platform/config.ts: could not read `UPLOAD_LIMITS.default` as a number expression.",
    );
  } else {
    const bytes = defaultMatch[1]
      .split("*")
      .map((part) => Number(part.trim()))
      .reduce((product, factor) => product * factor, 1);
    if (!Number.isFinite(bytes) || bytes > MAX_DEFAULT_UPLOAD_BYTES) {
      violations.push(
        `apps/api/src/lib/platform/config.ts: UPLOAD_LIMITS.default is ${bytes} bytes. Keep the global ceiling at or below ${MAX_DEFAULT_UPLOAD_BYTES} bytes.`,
      );
    }
  }
  return violations;
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
