#!/usr/bin/env tsx
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
/**
 * Revoke one reviewer grant immediately: ban the user, delete sessions,
 * API keys, and OAuth tokens.
 *
 * Usage:
 *   tsx --env-file=.env.development.local scripts/revoke-reviewer.ts --email "..."
 *
 * The nightly `reviewer-access-sweep` job does this automatically once a grant
 * passes `expires_at`. Use this CLI to end a window early.
 */
import { prisma } from "@bondery/db";
import { revokeReviewerGrant } from "../src/lib/bootstrap/revoke-expired-reviewers.js";

function readEmail(): string {
  const { values } = parseArgs({
    options: { email: { type: "string" } },
    strict: true,
  });
  if (!values.email) {
    throw new Error("--email is required");
  }
  return values.email;
}

async function main(): Promise<void> {
  const email = readEmail().trim().toLowerCase();
  const grant = await prisma.reviewerAccess.findFirst({
    select: { id: true, label: true },
    where: { user: { email: { equals: email, mode: "insensitive" } } },
  });

  if (!grant) {
    throw new Error(`no reviewer_access row for ${email}`);
  }

  const result = await revokeReviewerGrant(grant.id);
  if (!result) {
    throw new Error(`reviewer_access row ${grant.id} disappeared during revoke`);
  }

  console.log(`revoke-reviewer: revoked ${result.label} reviewer access (${email})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
