/**
 * Adds .js extensions to relative ESM imports in apps/api/src (NodeNext tsc).
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "api", "src");

const IMPORT_RE =
  /(?<=(?:import|export)\s+(?:type\s+)?(?:[^'"]+\s+from\s+|)|(?<=import\s*\(\s*))(['"])(\.\.?\/[^'"]+)\1/g;

function needsExtension(specifier) {
  return !/\.(js|json|node|mjs|cjs)$/.test(specifier);
}

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) {
      continue;
    }

    const original = await readFile(full, "utf8");
    const updated = original.replace(IMPORT_RE, (match, quote, specifier) => {
      if (!needsExtension(specifier)) {
        return match;
      }
      return `${quote}${specifier}.js${quote}`;
    });
    if (updated !== original) {
      await writeFile(full, updated);
      console.log(`updated ${full.replace(srcRoot, "src")}`);
    }
  }
}

await walk(srcRoot);
