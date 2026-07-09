import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const apiSrc = join(import.meta.dirname, "..", "src");
const codes = new Set<string>();

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.endsWith(".ts")) {
      continue;
    }

    const content = readFileSync(path, "utf8");
    const patterns = [
      /(?:internal|badRequest|notFound|forbidden|conflict|unauthorized)\([^)]*?,\s*"([A-Z][A-Z0-9_]+)"/g,
      /(?:internal|badRequest|notFound|forbidden|conflict|unauthorized)\(\s*"([A-Z][A-Z0-9_]+)"/g,
      /new DomainError\([^)]*?,\s*"([A-Z][A-Z0-9_]+)"/g,
      /ErrorCodes\.([A-Z][A-Z0-9_]+)/g,
      /code:\s*"([A-Z][A-Z0-9_]+)"/g,
    ];

    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern)) {
        codes.add(match[1]);
      }
    }
  }
}

walk(apiSrc);
for (const code of [...codes].sort()) {
  console.log(code);
}
console.error(`count: ${codes.size}`);
