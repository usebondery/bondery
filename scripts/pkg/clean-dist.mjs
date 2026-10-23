/**
 * Remove package build outputs without relying on the `rimraf` CLI.
 * pnpm `enableGlobalVirtualStore` + Docker `--ignore-scripts` can leave
 * store-link bin shims pointing at missing files.
 */
import fs from "node:fs";

for (const target of process.argv.slice(2)) {
  fs.rmSync(target, { force: true, recursive: true });
}
