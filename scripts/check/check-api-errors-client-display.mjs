/**
 * Ban raw error.message in user-facing notification UI in webapp + mobile.
 *
 * Usage: node scripts/check/check-api-errors-client-display.mjs (pnpm run check:api-errors:client-display)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const TSX_TS_RE = /\.(?<group1>tsx|ts)$/u;

const check = createCheck("check-api-errors-client-display");

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const targets = [join(repoRoot, "apps", "webapp", "src"), join(repoRoot, "apps", "mobile", "src")];

const sharedBanned = [
  /error instanceof Error \? error\.message/u,
  /\berror\.message\b.*(?:description|title|Alert|notification|toast|showNotification)/iu,
  /description:\s*error\.message/u,
];

const mobileAliasBanned = [
  /\berr instanceof Error \? err\.message/u,
  /\bloadError instanceof Error \? loadError\.message/u,
  /\bcreateError instanceof Error(?: && createError\.message|\s*\? createError\.message)/u,
  /\b(?:err|loadError|createError|deleteError|logoutError)\.message\b.*(?:description|title|Alert|notification|toast|showNotification|errorDescription)/iu,
  /description:\s*(?:err|loadError|createError|deleteError|logoutError)\.message/u,
];

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...collectFiles(path));
      continue;
    }
    if (TSX_TS_RE.test(entry) && !entry.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

for (const root of targets) {
  for (const file of collectFiles(root)) {
    const rel = relative(repoRoot, file).replace(/\\/gu, "/");
    if (
      rel.includes("/lib/api/") ||
      rel.includes("getUserFacingError") ||
      rel.includes("/lib/sync/sync-logger") ||
      rel.includes("RootErrorBoundary")
    ) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (
        line.includes("getUserFacingError") ||
        line.includes("getUserMessage(") ||
        line.includes("resolveDisplayedError")
      ) {
        continue;
      }
      if (line.includes("console.") || line.includes("//")) {
        continue;
      }
      const patterns = rel.includes("/apps/mobile/")
        ? [...sharedBanned, ...mobileAliasBanned]
        : sharedBanned;
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          check.add(
            `${rel}:${i + 1}: shows a raw error message to the user: ${line.trim()}
      Pass the error to getUserFacingError() and show its message instead, so the user reads a translated catalog string and not a server detail.`,
          );
        }
      }
    }
  }
}

check.ok();
