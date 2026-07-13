/**
 * Static checks for Fastify route OpenAPI schema completeness.
 *
 * Usage: npx tsx scripts/check-api-schema-patterns.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRouteNonPluginFiles } from "./load-route-non-plugin-files.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const routesRoot = join(__dirname, "..", "src", "routes");

const INTERNAL_ROUTE_FILES = new Set(["webhooks/polar.ts", "internal/reminder-digest.ts"]);

/** Utility modules under routes/ that are not Fastify route plugins. */
const NON_ROUTE_FILES = loadRouteNonPluginFiles();

const ROUTE_METHOD_RE =
  /fastify\.(get|post|put|patch|delete)\(\s*[\s\S]*?schema:\s*\{[\s\S]*?\}\s*satisfies\s+FastifyZodOpenApiSchema/gs;

const ROUTE_WITHOUT_SCHEMA_RE =
  /fastify\.(get|post|put|patch|delete)\(\s*["'`][^"'`]+["'`]\s*,\s*async/g;

function collectRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectRouteFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const violations: string[] = [];

for (const file of collectRouteFiles(routesRoot)) {
  const rel = relative(join(__dirname, "..", "src"), file).replace(/\\/g, "/");
  if (!rel.startsWith("routes/")) {
    continue;
  }

  const routeRel = rel.replace(/^routes\//, "");
  if (INTERNAL_ROUTE_FILES.has(routeRel) || NON_ROUTE_FILES.has(routeRel)) {
    continue;
  }

  const content = readFileSync(file, "utf8");

  const schemaBlocks = [...content.matchAll(ROUTE_METHOD_RE)];
  for (const match of schemaBlocks) {
    const block = match[0];
    if (!block.includes("response:")) {
      violations.push(`${routeRel}: route schema missing response block`);
    }
    if (!block.includes("description:")) {
      violations.push(`${routeRel}: route schema missing description`);
    }
  }

  const routesWithoutSchema = [...content.matchAll(ROUTE_WITHOUT_SCHEMA_RE)];
  if (routesWithoutSchema.length > 0) {
    violations.push(
      `${routeRel}: ${routesWithoutSchema.length} route(s) without FastifyZodOpenApiSchema`,
    );
  }
}

if (violations.length > 0) {
  console.error(
    `API schema pattern check failed:\n${violations.map((v) => `  - ${v}`).join("\n")}`,
  );
  process.exit(1);
}

console.log("check-api-schema-patterns: ok");
