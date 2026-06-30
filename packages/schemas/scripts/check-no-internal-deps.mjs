/**
 * Ensures @bondery/schemas does not depend on other @bondery/* packages.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const srcRoot = join(packageRoot, "src");

const forbiddenPattern = /@bondery\//;

function collectSourceFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];

for (const file of collectSourceFiles(srcRoot)) {
  const content = readFileSync(file, "utf8");
  if (forbiddenPattern.test(content)) {
    violations.push(relative(packageRoot, file));
  }
}

if (violations.length > 0) {
  console.error(
    "@bondery/schemas must not import other @bondery/* packages:\n" +
      violations.map((file) => `  - ${file}`).join("\n"),
  );
  process.exit(1);
}

console.log("check-no-internal-deps: ok");
