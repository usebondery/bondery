/**
 * Fail when a generated path lives inside a workspace package.
 *
 * `injectWorkspacePackages: true` hardlinks each package into the pnpm store
 * so `pnpm deploy` can copy it into the API image. pnpm re-syncs only `dist/`
 * after `build` and `compile`. Any other generated file inside `packages/*`
 * breaks those hardlinks (`ERR_PNPM_INJECTED_DEPS_SYNC_LINK`).
 *
 * The check fails on:
 * 1. A `.gitignore` pattern rooted at `packages/<name>/` that is not an
 *    allowed build artifact.
 * 2. A package-local `.gitignore` pattern that is not an allowed build artifact.
 * 3. A gitignored file or directory on disk under `packages/` that is not an
 *    allowed build artifact.
 *
 * Allowed on disk: `dist/`, `node_modules/`, `.turbo/`, `*.tsbuildinfo`, `.env*`.
 * Allowed as a package .gitignore rule, in addition: stray tsc emit under src
 * (js, jsx, d.ts, and map globs). A file that matches those globs still fails
 * when it exists on disk.
 *
 * Usage: node scripts/check/check-injected-packages.mjs
 *        (pnpm run check:injected-packages)
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-injected-packages");

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const PACKAGES_ROOT = join(ROOT, "packages");

/** Directory names pnpm or the toolchain may rewrite inside a package. */
const ALLOWED_DIR_NAMES = new Set(["dist", "node_modules", ".turbo"]);

/**
 * Package `.gitignore` rules that only block stray `tsc` output next to
 * sources. The build writes `dist/`, so these files must not exist.
 */
const COMPILER_EMIT_GLOBS = new Set([
  "src/**/*.js",
  "src/**/*.jsx",
  "src/**/*.d.ts",
  "src/**/*.d.ts.map",
  "src/**/*.js.map",
]);

const HINT =
  "Write generated files outside packages/* (repo-root .temp/). Allowed inside a package: dist/, node_modules/, .turbo/, *.tsbuildinfo, .env*.";

/**
 * @param {string} pattern raw gitignore pattern
 * @returns {string | null} pattern body, or null when the line is not a rule
 */
function patternBody(pattern) {
  const trimmed = pattern.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) {
    return null;
  }
  let body = trimmed.startsWith("!") ? trimmed.slice(1) : trimmed;
  if (body.startsWith("/")) {
    body = body.slice(1);
  }
  body = body.replace(/\/+$/, "");
  if (body.endsWith("/**")) {
    body = body.slice(0, -3);
  }
  return body;
}

/**
 * @param {string} inside path under `packages/<name>/` or under a package root
 */
function isAllowedInside(inside) {
  const parts = inside.split("/").filter((part) => part.length > 0);
  if (parts.length === 0) {
    return false;
  }
  if (parts.some((part) => ALLOWED_DIR_NAMES.has(part))) {
    return true;
  }
  const base = parts[parts.length - 1] ?? "";
  return base === "*.tsbuildinfo" || base.endsWith(".tsbuildinfo");
}

/** Local env files are secrets, not build output. */
function isEnvFile(inside) {
  const base = inside.split("/").pop() ?? "";
  return base === ".env" || base.startsWith(".env.");
}

function isAllowedIgnorePattern(inside) {
  return isAllowedInside(inside) || COMPILER_EMIT_GLOBS.has(inside);
}

function isAllowedOnDisk(inside) {
  return isAllowedInside(inside) || isEnvFile(inside);
}

/**
 * @param {string} body pattern relative to the repo root
 */
function isAllowedRepoPattern(body) {
  if (!body.startsWith("packages/")) {
    return true;
  }
  const rest = body.slice("packages/".length);
  const slash = rest.indexOf("/");
  if (slash === -1) {
    return false;
  }
  return isAllowedIgnorePattern(rest.slice(slash + 1));
}

function readIgnoreRules(filePath) {
  return readFileSync(filePath, "utf8").split(/\r?\n/);
}

function checkRootGitignore() {
  const filePath = join(ROOT, ".gitignore");
  const lines = readIgnoreRules(filePath);
  for (let index = 0; index < lines.length; index += 1) {
    const body = patternBody(lines[index] ?? "");
    if (body === null || !body.startsWith("packages/")) {
      continue;
    }
    if (!isAllowedRepoPattern(body)) {
      check.add(`.gitignore:${index + 1}: ${body} ignores a path inside a package. ${HINT}`);
    }
  }
}

function checkPackageGitignores() {
  for (const entry of readdirSync(PACKAGES_ROOT)) {
    const packageDir = join(PACKAGES_ROOT, entry);
    if (!statSync(packageDir).isDirectory()) {
      continue;
    }
    const filePath = join(packageDir, ".gitignore");
    let lines;
    try {
      lines = readIgnoreRules(filePath);
    } catch {
      continue;
    }
    for (let index = 0; index < lines.length; index += 1) {
      const body = patternBody(lines[index] ?? "");
      if (body === null) {
        continue;
      }
      if (!isAllowedIgnorePattern(body)) {
        check.add(
          `packages/${entry}/.gitignore:${index + 1}: ${body} ignores a path inside a package. ${HINT}`,
        );
      }
    }
  }
}

function checkIgnoredPathsOnDisk() {
  const output = execFileSync(
    "git",
    [
      "ls-files",
      "--others",
      "--ignored",
      "--exclude-standard",
      "--directory",
      "-z",
      "--",
      "packages",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  for (const raw of output.split("\0")) {
    if (raw.length === 0) {
      continue;
    }
    const repoPath = raw.replace(/\\/g, "/").replace(/\/+$/, "");
    const parts = repoPath.split("/");
    if (parts[0] !== "packages" || parts.length < 3) {
      check.add(`${repoPath} is gitignored inside packages/. ${HINT}`);
      continue;
    }
    if (!isAllowedOnDisk(parts.slice(2).join("/"))) {
      check.add(`${repoPath} is gitignored inside a package. ${HINT}`);
    }
  }
}

checkRootGitignore();
checkPackageGitignores();
checkIgnoredPathsOnDisk();
check.ok();
