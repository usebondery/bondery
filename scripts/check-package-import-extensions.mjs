/**
 * Guard: workspace packages must use NodeNext-style relative imports via #* with .js extensions.
 * Usage: node scripts/check-package-import-extensions.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const PACKAGE_SRC_DIRS = [
  "schemas",
  "helpers",
  "vcard",
  "emails",
  "branding",
  "mantine-next",
  "translations",
].map((name) => join(ROOT, "packages", name, "src"));

const EXTENSIONLESS_RELATIVE = /from\s+["'](\.\.?\/[^"']+)["']/g;
const EXTENSIONLESS_DYNAMIC = /import\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g;
const ASSET_EXTENSIONS = /\.(json|css|svg|png|jpg|jpeg|gif|webp|woff2?)$/i;

function isAssetImport(specifier) {
  return ASSET_EXTENSIONS.test(specifier);
}

function isExtensionlessRelative(specifier) {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return false;
  }
  if (specifier.startsWith("#")) {
    return false;
  }
  if (isAssetImport(specifier)) {
    return false;
  }
  const lastSegment = specifier.split("/").pop() ?? "";
  return !lastSegment.includes(".");
}

function collectViolations(code, filePath) {
  const violations = [];

  for (const pattern of [EXTENSIONLESS_RELATIVE, EXTENSIONLESS_DYNAMIC]) {
    pattern.lastIndex = 0;
    for (const match of code.matchAll(pattern)) {
      const specifier = match[1];
      if (isExtensionlessRelative(specifier)) {
        violations.push({ filePath, specifier });
      }
    }
  }

  return violations;
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
        if (fullPath.includes("/generated/")) {
          return [];
        }
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

async function main() {
  const violations = [];

  for (const dir of PACKAGE_SRC_DIRS) {
    const files = await collectSourceFiles(dir);
    for (const filePath of files) {
      const code = await readFile(filePath, "utf8");
      violations.push(...collectViolations(code, filePath));
    }
  }

  if (violations.length > 0) {
    console.error("Extensionless relative imports found in packages (use #* with .js suffix):\n");
    for (const { filePath, specifier } of violations) {
      console.error(`  ${filePath}: ${specifier}`);
    }
    process.exit(1);
  }

  console.log("All package imports use #* hash paths or asset extensions.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
