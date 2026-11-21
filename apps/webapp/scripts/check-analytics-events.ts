/**
 * Ensures captureEvent/captureServerEvent use PostHog category:object_action names.
 * Run via: pnpm run check:analytics-events
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-analytics-events");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEBAPP_SRC = join(__dirname, "..", "src");
const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

type Violation = { file: string; rule: string; detail: string };

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") {
        continue;
      }
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function extractEventNames(content: string, callee: string): string[] {
  const pattern = new RegExp(`${callee}\\(\\s*["'\`]([^"'\`]+)["'\`]`, "g");
  const names: string[] = [];
  let match = pattern.exec(content);
  while (match) {
    const [, name] = match;
    if (name !== undefined) {
      names.push(name);
    }
    match = pattern.exec(content);
  }
  return names;
}

function checkFile(absPath: string): Violation[] {
  const rel = relative(WEBAPP_SRC, absPath).replace(/\\/g, "/");
  if (rel.startsWith("lib/analytics/")) {
    return [];
  }

  const content = readFileSync(absPath, "utf8");
  const violations: Violation[] = [];

  for (const callee of ["captureEvent", "captureServerEvent"]) {
    if (!content.includes(callee)) {
      continue;
    }

    for (const eventName of extractEventNames(content, callee)) {
      if (!EVENT_NAME_PATTERN.test(eventName)) {
        violations.push({
          detail: `${callee}("${eventName}") must use category:object_action naming`,
          file: rel,
          rule: "analytics-event-name",
        });
      }
    }
  }

  return violations;
}

const violations = walk(WEBAPP_SRC).flatMap(checkFile);

for (const violation of violations) {
  check.add(`${violation.file}: ${violation.detail}`);
}

check.ok(`${walk(WEBAPP_SRC).length} files checked`);
