import type {
  EmailEntry,
  MergeConflictChoice,
  MergeConflictField,
  PhoneEntry,
} from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { replaceContactEmails, replaceContactPhones } from "../../lib/contacts/channels.js";
import {
  normalizeEmailSet,
  normalizePhoneSet,
  resolveConflictChoice,
} from "../../lib/contacts/merge-helpers.js";
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
      prefix: phone.prefix || "+1",
      type: phone.type || "home",
      value: String(phone.value || "").trim(),
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
      type: email.type || "home",
      value: String(email.value || "").trim(),
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

  if (!leftItems.length && rightItems.length) {
    return rightItems;
  }

  if (leftItems.length && rightItems.length && !itemsEqual) {
    const choice = resolveConflictChoice(conflictResolutions, field);
    return choice === "right" ? rightItems : leftItems;
  }

  return leftItems;
}

export async function mergeContactPhones(
  client: SupabaseClient<Database>,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const [
    { data: leftPhones, error: leftPhonesError },
    { data: rightPhones, error: rightPhonesError },
  ] = await Promise.all([
    client
      .from("people_phones")
      .select("prefix, value, type, preferred")
      .eq("user_id", userId)
      .eq("person_id", leftPersonId)
      .order("sort_order", { ascending: true }),
    client
      .from("people_phones")
      .select("prefix, value, type, preferred")
      .eq("user_id", userId)
      .eq("person_id", rightPersonId)
      .order("sort_order", { ascending: true }),
  ]);

  if (leftPhonesError || rightPhonesError) {
    throw internal("contact_merge_phones_load_failed", leftPhonesError ?? rightPhonesError);
  }

  const normalizedLeftPhones = normalizePhones(leftPhones || []);
  const normalizedRightPhones = normalizePhones(rightPhones || []);
  const mergedPhones = resolveMergedCollection(
    normalizedLeftPhones,
    normalizedRightPhones,
    normalizePhoneSet,
    "phones",
    conflictResolutions,
  );

  try {
    await replaceContactPhones(client, userId, leftPersonId, mergedPhones as PhoneEntry[]);
  } catch (phoneError) {
    const message = phoneError instanceof Error ? phoneError.message : "Failed to merge phones";
    throw internal("contact_merge_failed", message);
  }
}

export async function mergeContactEmails(
  client: SupabaseClient<Database>,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const [
    { data: leftEmails, error: leftEmailsError },
    { data: rightEmails, error: rightEmailsError },
  ] = await Promise.all([
    client
      .from("people_emails")
      .select("value, type, preferred")
      .eq("user_id", userId)
      .eq("person_id", leftPersonId)
      .order("sort_order", { ascending: true }),
    client
      .from("people_emails")
      .select("value, type, preferred")
      .eq("user_id", userId)
      .eq("person_id", rightPersonId)
      .order("sort_order", { ascending: true }),
  ]);

  if (leftEmailsError || rightEmailsError) {
    throw internal("contact_merge_emails_load_failed", leftEmailsError ?? rightEmailsError);
  }

  const normalizedLeftEmails = normalizeEmails(leftEmails || []);
  const normalizedRightEmails = normalizeEmails(rightEmails || []);
  const mergedEmails = resolveMergedCollection(
    normalizedLeftEmails,
    normalizedRightEmails,
    normalizeEmailSet,
    "emails",
    conflictResolutions,
  );

  try {
    await replaceContactEmails(client, userId, leftPersonId, mergedEmails as EmailEntry[]);
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : "Failed to merge emails";
    throw internal("contact_merge_failed", message);
  }
}
