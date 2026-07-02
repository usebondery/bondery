/**
 * One-off: remove runtime OpenAPI fixture imports from entity modules (SSR TDZ fix).
 * Examples remain in openapi/fixtures for API docs generation scripts.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const entitiesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "entities");

for (const file of readdirSync(entitiesDir)) {
  if (!file.endsWith(".ts") || file === "index.ts") continue;
  const path = join(entitiesDir, file);
  let src = readFileSync(path, "utf8");
  const before = src;

  src = src.replace(
    /^import\s+\{[^}]*\}\s+from\s+["']#openapi\/fixtures\/schema-examples\.js["'];\r?\n/gm,
    "",
  );
  src = src.replace(
    /^import\s+\{[^}]*\}\s+from\s+["']#openapi\/fixtures\/requests\.js["'];\r?\n/gm,
    "",
  );
  src = src.replace(
    /^import\s+\{[^}]*\}\s+from\s+["']#openapi\/fixtures\/errors\.js["'];\r?\n/gm,
    "",
  );
  src = src.replace(/\.meta\(\{\s*example:\s*EXAMPLE_[A-Z0-9_]+,?\s*\}\)/g, "");
  src = src.replace(/\.meta\(\{\s*example:\s*EXAMPLE_[A-Z0-9_]+\s*\}\)/g, "");
  src = src.replace(/,\s*example:\s*EXAMPLE_[A-Z0-9_]+/g, "");
  src = src.replace(/example:\s*EXAMPLE_[A-Z0-9_]+,?\s*/g, "");

  if (src !== before) {
    writeFileSync(path, src);
    console.log("stripped", file);
  }
}
