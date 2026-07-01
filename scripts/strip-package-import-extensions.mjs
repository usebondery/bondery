/**
 * One-shot codemod: strip .js from relative import/export specifiers in workspace packages and apps/api.
 * Usage: node scripts/strip-package-import-extensions.mjs
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCAN_DIRS = [
  ...["schemas", "helpers", "vcard", "emails", "branding"].map((name) =>
    join(ROOT, "packages", name, "src"),
  ),
  join(ROOT, "apps", "api", "src"),
  join(ROOT, "apps", "api", "scripts"),
];

const RELATIVE_JS_FROM = /from\s+(["'])(\.\.?\/[^"']+)\.js\1/g;
const RELATIVE_JS_DYNAMIC_IMPORT = /import\s*\(\s*(["'])(\.\.?\/[^"']+)\.js\1\s*\)/g;

function stripExtensions(code) {
  return code
    .replace(RELATIVE_JS_FROM, "from $1$2$1")
    .replace(RELATIVE_JS_DYNAMIC_IMPORT, "import($1$2$1)");
}

async function collectSourceFiles(dir) {
  const entries = await readdir(dir);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry);
      const info = await stat(fullPath);
      if (info.isDirectory()) {
        return collectSourceFiles(fullPath);
      }
      if (/\.(ts|tsx)$/.test(entry)) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

async function main() {
  let changedFiles = 0;

  for (const srcDir of SCAN_DIRS) {
    let files;
    try {
      await stat(srcDir);
      files = await collectSourceFiles(srcDir);
    } catch {
      continue;
    }

    for (const filePath of files) {
      const original = await readFile(filePath, "utf8");
      const updated = stripExtensions(original);
      if (updated !== original) {
        await writeFile(filePath, updated, "utf8");
        changedFiles += 1;
        console.log(`updated: ${filePath.replace(ROOT + "\\", "").replace(ROOT + "/", "")}`);
      }
    }
  }

  console.log(`Done. ${changedFiles} file(s) updated.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
