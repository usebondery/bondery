/**
 * Ensures web-safe schema modules do not import API-only OpenAPI/HTTP response graphs
 * that can create Turbopack SSR initialization cycles.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const srcRoot = join(packageRoot, "src");

const FORBIDDEN_IMPORTS = [
  "#openapi/fixtures/responses.js",
  "#openapi/registry.js",
  "#http/responses.js",
  "#sync/conflict.js",
];

const HTTP_INDEX_FORBIDDEN_IMPORTS = [
  "#openapi/fixtures/requests.js",
];

const GUARDED_RELATIVE_PATHS = [
  "entities",
  "constants",
  "format.ts",
  "primitives",
  "http/index.ts",
];

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
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function isGuardedFile(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
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
  if (!isGuardedFile(rel)) {
    continue;
  }

  const content = readFileSync(file, "utf8");
  for (const forbidden of FORBIDDEN_IMPORTS) {
    if (content.includes(forbidden)) {
      violations.push({ file: rel, forbidden });
    }
  }

  if (rel.replace(/\\/g, "/") === "http/index.ts") {
    for (const forbidden of HTTP_INDEX_FORBIDDEN_IMPORTS) {
      if (content.includes(forbidden)) {
        violations.push({ file: rel, forbidden });
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Web-safe schema modules must not import API-only fixture graphs:\n");
  for (const { file, forbidden } of violations) {
    console.error(`  - src/${file} imports ${forbidden}`);
  }
  process.exit(1);
}

const indexPath = join(srcRoot, "index.ts");
const indexContent = readFileSync(indexPath, "utf8");
if (indexContent.includes("#http/index.js")) {
  console.error(
    "src/index.ts must not re-export #http/index.js — use @bondery/schemas/http in API routes only.",
  );
  process.exit(1);
}

console.log("check-no-init-cycles: ok");
