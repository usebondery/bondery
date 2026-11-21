#!/usr/bin/env tsx
/**
 * Release migration gate — see packages/db/src/release-migrate.ts.
 *
 * Usage: tsx scripts/release-migrate.ts
 */
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runReleaseMigrate } from "../src/release-migrate.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

async function main() {
  await runReleaseMigrate({
    provisionOAuthClients: async () => {
      execFileSync("pnpm", ["--filter", "api", "run", "provision-oauth-clients"], {
        cwd: repoRoot,
        env: process.env,
        stdio: "inherit",
      });
    },
    provisionPlatformAdmins: async () => {
      execFileSync("pnpm", ["--filter", "api", "run", "provision-platform-admins"], {
        cwd: repoRoot,
        env: process.env,
        stdio: "inherit",
      });
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
