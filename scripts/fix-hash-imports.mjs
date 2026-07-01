/**
 * Fix hash imports: use #path.js for src/path.ts files, #path/index.js for directories.
 */
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HASH_RE = /#([a-zA-Z0-9_./-]+)\.js/g;

const PACKAGE_SRC_DIRS = [
  "schemas",
  "helpers",
  "vcard",
  "emails",
  "branding",
  "mantine-next",
  "translations",
].map((name) => join(root, "packages", name, "src"));

function correctHashPath(srcRoot, hashPath) {
  const withoutIndex = hashPath.replace(/\/index$/, "");
  const asFile = join(srcRoot, `${withoutIndex}.ts`);
  const asFileTsx = join(srcRoot, `${withoutIndex}.tsx`);
  const asDirIndex = join(srcRoot, hashPath.replace(/\/index$/, ""), "index.ts");
  const asDirIndexTsx = join(srcRoot, hashPath.replace(/\/index$/, ""), "index.tsx");

  if (hashPath.endsWith("/index")) {
    if (existsSync(asDirIndex) || existsSync(asDirIndexTsx)) {
      return hashPath;
    }
    if (existsSync(asFile) || existsSync(asFileTsx)) {
      return withoutIndex;
    }
  } else {
    if (existsSync(asFile) || existsSync(asFileTsx)) {
      return hashPath;
    }
    const dirIndex = join(srcRoot, hashPath, "index.ts");
    if (existsSync(dirIndex) || existsSync(join(srcRoot, hashPath, "index.tsx"))) {
      return `${hashPath}/index`;
    }
  }
  return hashPath;
}

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const srcDir of PACKAGE_SRC_DIRS) {
  const files = await collectSourceFiles(srcDir);
  for (const filePath of files) {
    const original = await readFile(filePath, "utf8");
    const updated = original.replace(HASH_RE, (full, hashPath) => {
      const fixed = correctHashPath(srcDir, hashPath);
      return `#${fixed}.js`;
    });
    if (updated !== original) {
      await writeFile(filePath, updated, "utf8");
      changed += 1;
    }
  }
}
console.log(`Fixed ${changed} file(s).`);
