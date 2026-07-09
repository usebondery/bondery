// Fails when .ts files exist at lib/ root (subsystem folders only).
//
// Usage: npx tsx scripts/check-lib-root.ts

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const libRoot = join(__dirname, "..", "src", "lib");

const ALLOWLIST = new Set<string>([]);

const rootFiles = readdirSync(libRoot).filter(
  (entry) => entry.endsWith(".ts") && !ALLOWLIST.has(entry),
);

if (rootFiles.length > 0) {
  console.error(
    "check-lib-root: lib/ root must contain only subdirectories — move these files into a subsystem folder:\n" +
      rootFiles.map((f) => `  - lib/${f}`).join("\n"),
  );
  process.exit(1);
}

console.log("check-lib-root: ok");
