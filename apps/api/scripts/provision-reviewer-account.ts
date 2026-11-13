#!/usr/bin/env tsx
/**
 * Thin CLI wrapper — logic lives in src/lib/bootstrap/provision-reviewer-account.ts.
 *
 * Usage: tsx --env-file=.env.development.local scripts/provision-reviewer-account.ts
 */
import { pathToFileURL } from "node:url";
import { provisionReviewerAccount } from "../src/lib/bootstrap/provision-reviewer-account.js";

async function main(): Promise<void> {
  await provisionReviewerAccount();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { provisionReviewerAccount } from "../src/lib/bootstrap/provision-reviewer-account.js";
