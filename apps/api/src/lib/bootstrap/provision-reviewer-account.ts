/**
 * One-shot reviewer account for the Claude connector sandbox.
 *
 * Creates the Better Auth user for `BONDERY_AUTH_REVIEWER_EMAIL` when the row is missing.
 * Calls `provisionNewUser`, then imports the sample export once.
 * A second run does not import again. This module does not run on API boot.
 *
 * The address local-part is the secret. The display name stays the fixed label `Reviewer`.
 */
import { readFile } from "node:fs/promises";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { BONDERY_SAMPLE_EXPORT_ZIP } from "@bondery/test-fixtures/fixtures";
import { applyBonderyImport } from "../../domains/me/import.js";
import { provisionNewUser } from "../auth/provision-new-user.js";
import logger from "../platform/logger.js";

const REVIEWER_EMAIL_ENV = "BONDERY_AUTH_REVIEWER_EMAIL";
const REVIEWER_DISPLAY_NAME = "Reviewer";

function requireReviewerEmail(): string {
  const email = process.env[REVIEWER_EMAIL_ENV]?.trim().toLowerCase() ?? "";
  if (!email) {
    throw new Error(`${REVIEWER_EMAIL_ENV} is not set`);
  }

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) {
    throw new Error(`${REVIEWER_EMAIL_ENV} must be one email address`);
  }

  return email;
}

export async function provisionReviewerAccount(): Promise<void> {
  const email = requireReviewerEmail();
  const existing = await prisma.user.findFirst({
    select: { id: true },
    where: { email: { equals: email, mode: "insensitive" } },
  });

  const userId = existing?.id ?? generateId();
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        emailVerified: true,
        id: userId,
        name: REVIEWER_DISPLAY_NAME,
      },
    });
    console.log("provision-reviewer-account: created user");
  } else {
    console.log("provision-reviewer-account: user already exists");
  }

  await provisionNewUser({
    email,
    name: REVIEWER_DISPLAY_NAME,
    userId,
  });

  const otherContacts = await prisma.people.count({
    where: { myself: false, userId },
  });
  if (otherContacts > 0) {
    console.log("provision-reviewer-account: sample contacts already present");
    return;
  }

  await applyBonderyImport(
    {
      log: logger,
      user: { email, id: userId },
    },
    await readFile(BONDERY_SAMPLE_EXPORT_ZIP),
  );
  console.log("provision-reviewer-account: imported sample contacts");
}
