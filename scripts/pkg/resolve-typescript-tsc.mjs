/**
 * Resolve the TypeScript `tsc` CLI path.
 *
 * TypeScript 7 no longer exports `typescript/bin/tsc`, so Node's
 * `require.resolve("typescript/bin/tsc")` fails. Resolve `package.json`, then
 * join `bin/tsc` (still listed in the package `bin` field).
 *
 * @param {string[]} fromDirs Absolute dirs that contain a package.json which
 *   can reach `typescript` (package dir first, then repo root).
 * @returns {string | null}
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export function resolveTypescriptTsc(fromDirs) {
  for (const from of fromDirs) {
    try {
      const require = createRequire(join(from, "package.json"));
      const packageJsonPath = require.resolve("typescript/package.json");
      return join(dirname(packageJsonPath), "bin", "tsc");
    } catch {
      // try next
    }
  }
  return null;
}
