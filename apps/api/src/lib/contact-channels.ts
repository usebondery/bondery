import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EmailEntry, PhoneEntry } from "@bondery/types";

type ContactWithId = { id: string };

type PersonChannelRows = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
};

type PhoneRow = {
  person_id: string;
  prefix: string;
  value: string;
  type: string;
  preferred: boolean;
};

type EmailRow = {
  person_id: string;
  value: string;
  type: string;
  preferred: boolean;
};

function normalizeContactType(value: unknown): "home" | "work" {
  return value === "work" ? "work" : "home";
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

/**
 * Parses and validates contact phone entries from API input payload.
 *
 * @param input Raw `phones` value from an update request body.
 * @returns Normalized phone entries preserving input order.
 * @throws Error when the payload shape is invalid.
 */
export function parsePhoneEntries(input: unknown): PhoneEntry[] {
  if (!Array.isArray(input)) {
    throw new Error("phones must be an array");
  }

  return input.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`phones[${index}] must be an object`);
    }

    const maybePrefix = (item as Record<string, unknown>).prefix;
    const maybeValue = (item as Record<string, unknown>).value;

    if (typeof maybePrefix !== "string" || maybePrefix.trim().length === 0) {
      throw new Error(`phones[${index}].prefix is required`);
    }

    if (typeof maybeValue !== "string" || maybeValue.trim().length === 0) {
      throw new Error(`phones[${index}].value is required`);
    }

    return {
      prefix: maybePrefix.trim(),
      value: maybeValue.trim(),
      type: normalizeContactType((item as Record<string, unknown>).type),
      preferred: toBoolean((item as Record<string, unknown>).preferred),
    };
  });
}

/**
 * Parses and validates contact email entries from API input payload.
 *
 * @param input Raw `emails` value from an update request body.
 * @returns Normalized email entries preserving input order.
 * @throws Error when the payload shape is invalid.
 */
export function parseEmailEntries(input: unknown): EmailEntry[] {
  if (!Array.isArray(input)) {
    throw new Error("emails must be an array");
  }

  return input.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`emails[${index}] must be an object`);
    }

    const maybeValue = (item as Record<string, unknown>).value;
    if (typeof maybeValue !== "string" || maybeValue.trim().length === 0) {
      throw new Error(`emails[${index}].value is required`);
    }

    return {
      value: maybeValue.trim(),
      type: normalizeContactType((item as Record<string, unknown>).type),
      preferred: toBoolean((item as Record<string, unknown>).preferred),
    };
  });
}

/**
 * Loads normalized phone and email rows for people and merges them into contact-shaped objects.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param contacts Contacts loaded from `people` table.
 * @returns Contacts with `phones` and `emails` arrays attached.
 */
export async function attachContactChannels<T extends ContactWithId>(
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
): Promise<Array<T & PersonChannelRows>> {
  if (!contacts.length) {
    return [];
  }

  const personIds = contacts.map((contact) => contact.id);

  const [{ data: phoneRows, error: phoneError }, { data: emailRows, error: emailError }] =
    await Promise.all([
      client
        .from("people_phones")
        .select("person_id, prefix, value, type, preferred")
        .eq("user_id", userId)
        .in("person_id", personIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      client
        .from("people_emails")
        .select("person_id, value, type, preferred")
        .eq("user_id", userId)
        .in("person_id", personIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (phoneError) {
    throw new Error(phoneError.message);
  }

  if (emailError) {
    throw new Error(emailError.message);
  }

  const map = new Map<string, PersonChannelRows>();

  for (const contact of contacts) {
    map.set(contact.id, { phones: [], emails: [] });
  }

  for (const row of (phoneRows || []) as PhoneRow[]) {
    const bucket = map.get(row.person_id);
    if (!bucket) continue;
    bucket.phones.push({
      prefix: row.prefix,
      value: row.value,
      type: normalizeContactType(row.type),
      preferred: row.preferred,
    });
  }

  for (const row of (emailRows || []) as EmailRow[]) {
    const bucket = map.get(row.person_id);
    if (!bucket) continue;
    bucket.emails.push({
      value: row.value,
      type: normalizeContactType(row.type),
      preferred: row.preferred,
    });
  }

  return contacts.map((contact) => {
    const channels = map.get(contact.id) || { phones: [], emails: [] };
    return {
      ...contact,
      phones: channels.phones,
      emails: channels.emails,
    };
  });
}

/**
 * Replaces all phone rows for a person with the provided ordered entries.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param personId Person id owning the channel entries.
 * @param phones Ordered phone entries.
 */
export async function replaceContactPhones(
  client: SupabaseClient<Database>,
  userId: string,
  personId: string,
  phones: PhoneEntry[],
): Promise<void> {
  const { error: deleteError } = await client
    .from("people_phones")
    .delete()
    .eq("user_id", userId)
    .eq("person_id", personId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (phones.length === 0) {
    return;
  }

  const insertRows = phones.map((phone, index) => ({
    user_id: userId,
    person_id: personId,
    prefix: phone.prefix,
    value: phone.value,
    type: phone.type,
    preferred: phone.preferred,
    sort_order: index,
  }));

  const { error: insertError } = await client.from("people_phones").insert(insertRows);
  if (insertError) {
    throw new Error(insertError.message);
  }
}

/**
 * Replaces all email rows for a person with the provided ordered entries.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param personId Person id owning the channel entries.
 * @param emails Ordered email entries.
 */
export async function replaceContactEmails(
  client: SupabaseClient<Database>,
  userId: string,
  personId: string,
  emails: EmailEntry[],
): Promise<void> {
  const { error: deleteError } = await client
    .from("people_emails")
    .delete()
    .eq("user_id", userId)
    .eq("person_id", personId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (emails.length === 0) {
    return;
  }

  const insertRows = emails.map((email, index) => ({
    user_id: userId,
    person_id: personId,
    value: email.value,
    type: email.type,
    preferred: email.preferred,
    sort_order: index,
  }));

  const { error: insertError } = await client.from("people_emails").insert(insertRows);
  if (insertError) {
    throw new Error(insertError.message);
  }
}
