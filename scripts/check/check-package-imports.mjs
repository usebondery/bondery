/**
 * Guard: workspace packages must use NodeNext-style relative imports via #* with .js extensions.
 * Usage: node scripts/check/check-package-imports.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCheck } from "./check-report.mjs";

const check = createCheck("check-package-imports");

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
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
        if (fullPath.replaceAll("\\", "/").includes("/generated/")) {
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
  for (const dir of PACKAGE_SRC_DIRS) {
    const files = await collectSourceFiles(dir);
    for (const filePath of files) {
      const code = await readFile(filePath, "utf8");
      for (const { filePath: violationPath, specifier } of collectViolations(code, filePath)) {
        check.add(`${violationPath}: ${specifier}`);
      }
    }
  }

  check.ok();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
