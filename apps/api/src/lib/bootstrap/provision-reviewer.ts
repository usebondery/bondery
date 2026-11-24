/**
 * Provision one external reviewer account.
 *
 * Creates the Better Auth user when missing, seeds app-domain rows, grants
 * `reviewer_access`, then imports the sample export once. Idempotent: a second
 * run refreshes the grant window and does not import again.
 *
 * Never sets `user.role` — reviewer access is a separate grant, not auth
 * elevation. See `docs/adr/0027-reviewer-access-grants.md`.
 */
import { readFile } from "node:fs/promises";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { BONDERY_SAMPLE_EXPORT_ZIP } from "@bondery/test-fixtures/fixtures";
import { applyBonderyImport } from "../../domains/me/import.js";
import { provisionNewUser } from "../auth/provision-new-user.js";
import logger from "../platform/logger.js";

const DEFAULT_REVIEW_DAYS = 30;
const MAX_REVIEW_DAYS = 90;

type ProvisionReviewerParams = {
  email: string;
  label: string;
  days?: number;
  note?: string;
  createdBy?: string;
};

type ProvisionReviewerResult = {
  expiresAt: Date;
  label: string;
  reviewerAccessId: string;
  userId: string;
};

function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) {
    throw new Error("--email must be one email address");
  }
  return email;
}

function resolveDays(days: number | undefined): number {
  const value = days ?? DEFAULT_REVIEW_DAYS;
  if (!Number.isInteger(value) || value < 1 || value > MAX_REVIEW_DAYS) {
    throw new Error(`--days must be an integer from 1 to ${MAX_REVIEW_DAYS}`);
  }
  return value;
}

export type { ProvisionReviewerParams, ProvisionReviewerResult };

export async function provisionReviewerAccount(
  params: ProvisionReviewerParams,
): Promise<ProvisionReviewerResult> {
  const email = normalizeEmail(params.email);
  const label = params.label.trim();
  if (!label) {
    throw new Error("--label is required");
  }

  const days = resolveDays(params.days);
  const createdBy = params.createdBy?.trim() || "cli";
  const displayName = `${label} Reviewer`;

  const existing = await prisma.user.findUnique({
    select: { id: true },
    where: { email },
  });

  const userId = existing?.id ?? generateId();
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        emailVerified: true,
        id: userId,
        name: displayName,
      },
    });
    console.log("provision-reviewer: created user");
  } else {
    console.log("provision-reviewer: user already exists");
  }

  await provisionNewUser({
    email,
    name: displayName,
    userId,
  });

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const grantData = {
    email,
    expiresAt,
    label,
    note: params.note?.trim() || null,
    revokedAt: null,
  };

  const grant = await prisma.reviewerAccess.upsert({
    create: { ...grantData, createdBy, id: generateId(), userId },
    update: grantData,
    where: { userId },
  });

  const otherContacts = await prisma.people.count({
    where: { myself: false, userId },
  });
  if (otherContacts > 0) {
    console.log("provision-reviewer: sample contacts already present");
  } else {
    await applyBonderyImport(
      {
        log: logger,
        user: { email, id: userId },
      },
      await readFile(BONDERY_SAMPLE_EXPORT_ZIP),
    );
    console.log("provision-reviewer: imported sample contacts");
  }

  return {
    expiresAt: grant.expiresAt,
    label: grant.label,
    reviewerAccessId: grant.id,
    userId,
  };
}
