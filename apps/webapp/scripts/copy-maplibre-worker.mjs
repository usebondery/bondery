/**
 * MapLibre GL v6 resolves its renderer worker from a URL. Turbopack rewrites
 * `import.meta.url` to `file:///ROOT/...`, so the default worker URL is empty
 * and the map logs "Worker failed to load". Copy the worker + shared sibling
 * into `public/maplibre/` so `setWorkerUrl` can point at a same-origin path.
 *
 * Both files must sit side by side — the worker imports shared by relative path.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(scriptsDir, "..");
const require = createRequire(import.meta.url);
const maplibreDist = path.join(
  path.dirname(require.resolve("maplibre-gl/package.json")),
  "dist",
);
const destDir = path.join(appDir, "public", "maplibre");

mkdirSync(destDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(maplibreDist, file), path.join(destDir, file));
}

console.log(`[maplibre] copied worker assets → ${path.relative(appDir, destDir)}`);
