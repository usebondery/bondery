/**
 * Remove package build outputs without relying on the `rimraf` CLI.
 * pnpm `enableGlobalVirtualStore` + Docker `--ignore-scripts` can leave
 * store-link bin shims pointing at missing files.
 *
 * Retries cover Windows: antivirus, the search indexer, or a typecheck reading `dist` briefly hold
 * handles on fresh files, and a recursive delete then fails with EPERM, EBUSY or ENOTEMPTY. Node
 * retries exactly those codes with a linear backoff (here up to about 2 seconds in total).
 */
import fs from "node:fs";

for (const target of process.argv.slice(2)) {
  fs.rmSync(target, { force: true, maxRetries: 10, recursive: true, retryDelay: 40 });
}
