#!/usr/bin/env tsx
/**
 * Thin CLI wrapper — logic lives in src/lib/bootstrap/provision-oauth-clients.ts.
 *
 * Usage: tsx --env-file=.env.development.local scripts/provision-oauth-clients.ts
 */
import { pathToFileURL } from "node:url";
import { provisionOAuthClients } from "../src/lib/bootstrap/provision-oauth-clients.js";

async function main(): Promise<void> {
  await provisionOAuthClients();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  hashOAuthClientSecret,
  provisionExtensionClient,
  provisionOAuthClients,
  provisionWebappClient,
  resolveResourceId,
} from "../src/lib/bootstrap/provision-oauth-clients.js";
