/**
 * Validates route security conventions: no auth hooks in route modules,
 * mount table covers all exported route plugins.
 *
 * Usage: npx tsx scripts/check-route-security.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRouteNonPluginFiles } from "./load-route-non-plugin-files.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const routesRoot = join(__dirname, "..", "src", "routes");
const registerAllPath = join(routesRoot, "register-all.ts");

const NON_ROUTE_FILES = loadRouteNonPluginFiles();

const NESTED_ROUTE_EXPORTS = new Set([
  "syncBootstrapRoutes",
  "syncPullRoutes",
  "syncPushRoutes",
  "syncWsTicketRoutes",
  "syncWsRoutes",
]);

const FORBIDDEN_IN_ROUTES = [
  "registerApiKeyProtectedHooks",
  "registerSessionAuthHooks",
  "registerAdminAuthHooks",
  "registerInternalAuthHooks",
  "fastify.auth([fastify.verify",
] as const;

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

function collectExportedRoutePlugins(dir: string): string[] {
  const exports: string[] = [];
  for (const file of collectRouteFiles(dir)) {
    const rel = relative(routesRoot, file).replace(/\\/g, "/");
    if (NON_ROUTE_FILES.has(rel)) {
      continue;
    }

    const content = readFileSync(file, "utf8");
    const matches = content.matchAll(/export const (\w+Routes): AppRoutePlugin/g);
    for (const match of matches) {
      const name = match[1];
      if (name && !NESTED_ROUTE_EXPORTS.has(name)) {
        exports.push(name);
      }
    }

    const asyncMatches = content.matchAll(/export async function (\w+Routes)\(/g);
    for (const match of asyncMatches) {
      const name = match[1];
      if (name && !NESTED_ROUTE_EXPORTS.has(name)) {
        exports.push(name);
      }
    }
  }
  return [...new Set(exports)];
}

const violations: string[] = [];

for (const file of collectRouteFiles(routesRoot)) {
  const rel = relative(join(__dirname, "..", "src"), file).replace(/\\/g, "/");
  if (!rel.startsWith("routes/")) {
    continue;
  }

  const routeRel = rel.replace(/^routes\//, "");
  if (NON_ROUTE_FILES.has(routeRel)) {
    continue;
  }

  const content = readFileSync(file, "utf8");
  for (const forbidden of FORBIDDEN_IN_ROUTES) {
    if (content.includes(forbidden)) {
      violations.push(
        `${routeRel}: must not use ${forbidden} — use route shells in register-all.ts`,
      );
    }
  }
}

const registerAllContent = readFileSync(registerAllPath, "utf8");
const mountedPlugins = [...registerAllContent.matchAll(/plugin:\s*(\w+)/g)].map(
  (match) => match[1],
);

const exportedPlugins = collectExportedRoutePlugins(routesRoot);
for (const plugin of exportedPlugins) {
  if (!mountedPlugins.includes(plugin)) {
    violations.push(
      `register-all.ts: exported route plugin ${plugin} is not mounted in ROUTE_MOUNTS`,
    );
  }
}

if (violations.length > 0) {
  console.error(`Route security check failed:\n${violations.map((v) => `  - ${v}`).join("\n")}`);
  process.exit(1);
}

console.log("check-route-security: ok");
