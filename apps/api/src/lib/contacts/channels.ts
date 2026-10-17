import type { PrismaClient } from "@bondery/db";
import { normalizePhoneParts } from "@bondery/helpers/phone";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import type { ContactWithId } from "../data/select-fragments.js";

type PersonChannelRows = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
};

function normalizeContactType(value: unknown): "home" | "work" {
  return value === "work" ? "work" : "home";
}

/**
 * Parses and validates contact phone entries from API input payload.
 */
export function parsePhoneEntries(
  input: unknown,
  defaultCountry: string | null = null,
): PhoneEntry[] {
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

    const normalized = normalizePhoneParts(maybePrefix.trim(), maybeValue.trim(), {
      defaultCountry,
    });

    if ("error" in normalized) {
      throw new Error(`phones[${index}].value is invalid`);
    }

    return {
      preferred: (item as Record<string, unknown>).preferred === true,
      prefix: normalized.prefix,
      type: normalizeContactType((item as Record<string, unknown>).type),
      value: normalized.value,
    };
  });
}

/**
 * Parses and validates contact email entries from API input payload.
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
      preferred: (item as Record<string, unknown>).preferred === true,
      type: normalizeContactType((item as Record<string, unknown>).type),
      value: maybeValue.trim(),
    };
  });
}

/**
 * Loads normalized phone and email rows for people and merges them into contact-shaped objects.
 */
export async function attachContactChannels<T extends ContactWithId>(
  db: PrismaClient,
  userId: string,
  contacts: T[],
): Promise<Array<T & PersonChannelRows>> {
  if (!contacts.length) {
    return [];
  }

  const personIds = contacts.map((contact) => contact.id);

  const [phoneRows, emailRows] = await Promise.all([
    db.peoplePhone.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { personId: true, preferred: true, prefix: true, type: true, value: true },
      where: { personId: { in: personIds }, userId },
    }),
    db.peopleEmail.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { personId: true, preferred: true, type: true, value: true },
      where: { personId: { in: personIds }, userId },
    }),
  ]);

  const map = new Map<string, PersonChannelRows>();

  for (const contact of contacts) {
    map.set(contact.id, { emails: [], phones: [] });
  }

  for (const row of phoneRows) {
    const bucket = map.get(row.personId);
    if (!bucket) {
      continue;
    }
    bucket.phones.push({
      preferred: row.preferred,
      prefix: row.prefix,
      type: normalizeContactType(row.type),
      value: row.value,
    });
  }

  for (const row of emailRows) {
    const bucket = map.get(row.personId);
    if (!bucket) {
      continue;
    }
    bucket.emails.push({
      preferred: row.preferred,
      type: normalizeContactType(row.type),
      value: row.value,
    });
  }

  return contacts.map((contact) => {
    const channels = map.get(contact.id) || { emails: [], phones: [] };
    return {
      ...contact,
      emails: channels.emails,
      phones: channels.phones,
    };
  });
}

/** Replaces all phone rows for a person with the provided ordered entries. */
export async function replaceContactPhones(
  db: PrismaClient,
  userId: string,
  personId: string,
  phones: PhoneEntry[],
): Promise<void> {
  await db.peoplePhone.deleteMany({
    where: { personId, userId },
  });

  if (phones.length === 0) {
    return;
  }

  await db.peoplePhone.createMany({
    data: phones.map((phone, index) => ({
      personId,
      preferred: phone.preferred,
      prefix: phone.prefix,
      sortOrder: index,
      type: phone.type,
      userId,
      value: phone.value,
    })),
  });
}

/** Replaces all email rows for a person with the provided ordered entries. */
export async function replaceContactEmails(
  db: PrismaClient,
  userId: string,
  personId: string,
  emails: EmailEntry[],
): Promise<void> {
  await db.peopleEmail.deleteMany({
    where: { personId, userId },
  });

  if (emails.length === 0) {
    return;
  }

  await db.peopleEmail.createMany({
    data: emails.map((email, index) => ({
      personId,
      preferred: email.preferred,
      sortOrder: index,
      type: email.type,
      userId,
      value: email.value,
    })),
  });
}
