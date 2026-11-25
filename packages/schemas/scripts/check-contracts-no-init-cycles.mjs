/**
 * Ensures runtime schema modules do not import API-only OpenAPI fixture graphs
 * that can create Turbopack SSR initialization cycles.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const TS_TSX_RE = /\.(?<group1>ts|tsx)$/u;

const check = createCheck("check-contracts-no-init-cycles");

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const srcRoot = join(packageRoot, "src");

/** Paths that ship in web/mobile runtime graphs — must not touch OpenAPI fixtures. */
const GUARDED_RELATIVE_PATHS = [
  "entities",
  "constants",
  "format.ts",
  "primitives",
  "sync",
  "geocode",
  "contact-id.ts",
  "index.ts",
];

/** API route helpers: no fixture barrels (inline small examples instead). */
const HTTP_INDEX_PATH = "http/index.ts";

const OPENAPI_IMPORT_MARKERS = ["#openapi/", "@bondery/schemas/openapi"];

function collectSourceFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (TS_TSX_RE.test(entry) && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function isGuardedFile(relPath) {
  const normalized = relPath.replace(/\\/gu, "/");
  return GUARDED_RELATIVE_PATHS.some((guarded) => {
    if (guarded.endsWith(".ts")) {
      return normalized === guarded;
    }
    return normalized === guarded || normalized.startsWith(`${guarded}/`);
  });
}

const violations = [];

for (const file of collectSourceFiles(srcRoot)) {
  const rel = relative(srcRoot, file);
  const normalized = rel.replace(/\\/gu, "/");
  const content = readFileSync(file, "utf8");

  if (isGuardedFile(rel)) {
    for (const marker of OPENAPI_IMPORT_MARKERS) {
      if (content.includes(marker)) {
        violations.push({ file: rel, forbidden: marker });
      }
    }

    if (normalized.startsWith("entities/") && content.includes("#geocode/")) {
      violations.push({ file: rel, forbidden: "#geocode/*" });
    }

    if (normalized.startsWith("entities/") && /\.meta\(\s*\{[^}]*\bexample\s*:/su.test(content)) {
      violations.push({
        file: rel,
        forbidden: ".meta({ example }) on entity schemas",
      });
    }
  }

  if (normalized === HTTP_INDEX_PATH) {
    for (const marker of OPENAPI_IMPORT_MARKERS) {
      if (content.includes(marker)) {
        violations.push({ file: rel, forbidden: marker });
      }
    }
  }
}

for (const { file, forbidden } of violations) {
  check.add(`src/${file}: ${forbidden}`);
}

const indexPath = join(srcRoot, "index.ts");
const indexContent = readFileSync(indexPath, "utf8");
if (indexContent.includes("#http/index.js")) {
  check.add(
    "src/index.ts must not re-export #http/index.js — use @bondery/schemas/http in API routes only.",
  );
}

if (indexContent.includes("#geocode/index.js")) {
  check.add(
    "src/index.ts must not re-export #geocode/index.js — use @bondery/schemas/geocode to avoid SSR init cycles.",
  );
}

check.ok();
