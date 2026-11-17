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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { BONDERY_EXPORT_FILE_ENTRIES } from "@bondery/schemas";
import AdmZip from "adm-zip";
import { applyBonderyImport } from "../../domains/me/import.js";
import { provisionNewUser } from "../auth/provision-new-user.js";
import logger from "../platform/logger.js";

const REVIEWER_EMAIL_ENV = "BONDERY_AUTH_REVIEWER_EMAIL";
const REVIEWER_DISPLAY_NAME = "Reviewer";

const SAMPLE_EXPORT_DIR = fileURLToPath(
  new URL("../../../../../packages/tests/sample-data/bondery/export-files/", import.meta.url),
);

const SAMPLE_EXPORT_FILES = [
  "manifest.json",
  ...BONDERY_EXPORT_FILE_ENTRIES.map((entry) => entry.name),
];

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

/** The sample export is a directory of JSON files. The parser expects one ZIP. */
async function buildSampleExportZip(): Promise<Buffer> {
  const zip = new AdmZip();
  for (const name of SAMPLE_EXPORT_FILES) {
    const bytes = await readFile(path.join(SAMPLE_EXPORT_DIR, name));
    zip.addFile(name, bytes);
  }
  return zip.toBuffer();
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
    await buildSampleExportZip(),
  );
  console.log("provision-reviewer-account: imported sample contacts");
}
