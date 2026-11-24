#!/usr/bin/env tsx
/**
 * Thin CLI wrapper — logic lives in src/lib/bootstrap/provision-platform-admins.ts.
 *
 * Usage: tsx --env-file=.env.development.local scripts/provision-platform-admins.ts
 */
import { pathToFileURL } from "node:url";
import { provisionPlatformAdmins } from "../src/lib/bootstrap/provision-platform-admins.js";

async function main(): Promise<void> {
  await provisionPlatformAdmins();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { provisionPlatformAdmins } from "../src/lib/bootstrap/provision-platform-admins.js";
