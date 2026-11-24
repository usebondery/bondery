import type { PrismaClient } from "@bondery/db";
import type {
  EmailEntry,
  MergeConflictChoice,
  MergeConflictField,
  PhoneEntry,
} from "@bondery/schemas";
import { replaceContactEmails, replaceContactPhones } from "../../lib/contacts/channels.js";
import {
  normalizeEmailSet,
  normalizePhoneSet,
  resolveConflictChoice,
} from "../../lib/contacts/merge-helpers.js";
import { orIfBlank } from "../../lib/platform/blank-text.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

type ConflictResolutions = Partial<Record<MergeConflictField, MergeConflictChoice>>;

function normalizePhones(
  phones: Array<{
    prefix: string | null;
    value: string | null;
    type: string | null;
    preferred: boolean | null;
  }>,
) {
  return phones
    .map((phone) => ({
      preferred: Boolean(phone.preferred),
      prefix: orIfBlank(phone.prefix, "+1"),
      type: orIfBlank(phone.type, "home"),
      value: (phone.value ?? "").trim(),
    }))
    .filter((phone) => phone.value.length > 0);
}

function normalizeEmails(
  emails: Array<{
    value: string | null;
    type: string | null;
    preferred: boolean | null;
  }>,
) {
  return emails
    .map((email) => ({
      preferred: Boolean(email.preferred),
      type: orIfBlank(email.type, "home"),
      value: (email.value ?? "").trim(),
    }))
    .filter((email) => email.value.length > 0);
}

function resolveMergedCollection<T>(
  leftItems: T[],
  rightItems: T[],
  normalize: (items: T[]) => unknown[],
  field: MergeConflictField,
  conflictResolutions: ConflictResolutions,
): T[] {
  const itemsEqual = JSON.stringify(normalize(leftItems)) === JSON.stringify(normalize(rightItems));

  if (leftItems.length === 0 && rightItems.length > 0) {
    return rightItems;
  }

  if (leftItems.length > 0 && rightItems.length > 0 && !itemsEqual) {
    const choice = resolveConflictChoice(conflictResolutions, field);
    return choice === "right" ? rightItems : leftItems;
  }

  return leftItems;
}

export async function mergeContactPhones(
  db: PrismaClient,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const [leftPhones, rightPhones] = await Promise.all([
    db.peoplePhone.findMany({
      orderBy: { sortOrder: "asc" },
      select: { preferred: true, prefix: true, type: true, value: true },
      where: { personId: leftPersonId, userId },
    }),
    db.peoplePhone.findMany({
      orderBy: { sortOrder: "asc" },
      select: { preferred: true, prefix: true, type: true, value: true },
      where: { personId: rightPersonId, userId },
    }),
  ]);

  const normalizedLeftPhones = normalizePhones(leftPhones);
  const normalizedRightPhones = normalizePhones(rightPhones);
  const mergedPhones = resolveMergedCollection(
    normalizedLeftPhones,
    normalizedRightPhones,
    normalizePhoneSet,
    "phones",
    conflictResolutions,
  );

  try {
    await replaceContactPhones(db, userId, leftPersonId, mergedPhones as PhoneEntry[]);
  } catch (phoneError) {
    const message = phoneError instanceof Error ? phoneError.message : "Failed to merge phones";
    throw internal("contact_merge_failed", message);
  }
}

export async function mergeContactEmails(
  db: PrismaClient,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const [leftEmails, rightEmails] = await Promise.all([
    db.peopleEmail.findMany({
      orderBy: { sortOrder: "asc" },
      select: { preferred: true, type: true, value: true },
      where: { personId: leftPersonId, userId },
    }),
    db.peopleEmail.findMany({
      orderBy: { sortOrder: "asc" },
      select: { preferred: true, type: true, value: true },
      where: { personId: rightPersonId, userId },
    }),
  ]);

  const normalizedLeftEmails = normalizeEmails(leftEmails);
  const normalizedRightEmails = normalizeEmails(rightEmails);
  const mergedEmails = resolveMergedCollection(
    normalizedLeftEmails,
    normalizedRightEmails,
    normalizeEmailSet,
    "emails",
    conflictResolutions,
  );

  try {
    await replaceContactEmails(db, userId, leftPersonId, mergedEmails as EmailEntry[]);
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : "Failed to merge emails";
    throw internal("contact_merge_failed", message);
  }
}
