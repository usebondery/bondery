import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

async function getJsFiles(dir) {
  const entries = await readdir(dir);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry);
      const info = await stat(fullPath);
      if (info.isDirectory()) {
        return getJsFiles(fullPath);
      }
      return fullPath.endsWith(".js") ? [fullPath] : [];
    }),
  );
  return files.flat();
}

function rewriteRelativeImports(code) {
  return code.replace(/from\s+"(\.{1,2}\/[^\"]+)"/g, (full, specifier) => {
    if (specifier.endsWith(".js") || specifier.endsWith(".json") || specifier.endsWith(".node")) {
      return full;
    }
    return full.replace(specifier, `${specifier}.js`);
  });
}

async function main() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const distDir = join(currentDir, "..", "dist");
  const jsFiles = await getJsFiles(distDir);

  await Promise.all(
    jsFiles.map(async (filePath) => {
      const original = await readFile(filePath, "utf8");
      const updated = rewriteRelativeImports(original);
      if (updated !== original) {
        await writeFile(filePath, updated, "utf8");
      }
    }),
  );
}

main().catch((error) => {
  console.error("Failed to rewrite ESM imports:", error);
  process.exit(1);
});
