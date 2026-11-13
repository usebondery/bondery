#!/usr/bin/env tsx
import { pathToFileURL } from "node:url";
/**
 * Provision or renew one external reviewer account.
 *
 * Usage:
 *   tsx --env-file=.env.development.local scripts/provision-reviewer.ts \
 *     --email "claude-review-7f3a9c2e@example.test" --label "Anthropic" [--days 30] [--note "..."]
 *
 * Re-running the same email refreshes `expires_at` and clears `revoked_at`.
 */
import { parseArgs } from "node:util";
import { provisionReviewerAccount } from "../src/lib/bootstrap/provision-reviewer.js";

function readOptions() {
  const { values } = parseArgs({
    options: {
      days: { type: "string" },
      email: { type: "string" },
      label: { type: "string" },
      note: { type: "string" },
    },
    strict: true,
  });

  if (!values.email) {
    throw new Error("--email is required");
  }
  if (!values.label) {
    throw new Error("--label is required");
  }

  return {
    days: values.days === undefined ? undefined : Number(values.days),
    email: values.email,
    label: values.label,
    note: values.note,
  };
}

async function main(): Promise<void> {
  const result = await provisionReviewerAccount({ ...readOptions(), createdBy: "cli" });
  console.log(
    `provision-reviewer: granted ${result.label} reviewer access until ${result.expiresAt.toISOString()}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}

export { provisionReviewerAccount } from "../src/lib/bootstrap/provision-reviewer.js";
