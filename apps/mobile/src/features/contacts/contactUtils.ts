import type { Contact, EmailEntry, PhoneEntry } from "@bondery/types";

export function formatContactName(contact: Contact): string {
  const firstName = contact.firstName?.trim() || "";
  const middleName = contact.middleName?.trim() || "";
  const lastName = contact.lastName?.trim() || "";

  return [firstName, middleName, lastName].filter(Boolean).join(" ").trim() || "Unknown";
}

export function getContactInitial(contact: Contact): string {
  const fullName = formatContactName(contact);
  return fullName.charAt(0).toUpperCase() || "#";
}

function parsePhones(phones: Contact["phones"]): PhoneEntry[] {
  if (!Array.isArray(phones)) {
    return [];
  }

  return phones.filter((entry): entry is PhoneEntry => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    return typeof (entry as PhoneEntry).value === "string";
  });
}

function parseEmails(emails: Contact["emails"]): EmailEntry[] {
  if (!Array.isArray(emails)) {
    return [];
  }

  return emails.filter((entry): entry is EmailEntry => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    return typeof (entry as EmailEntry).value === "string";
  });
}

export function getPrimaryPhone(contact: Contact): string | null {
  const phone =
    parsePhones(contact.phones).find((entry) => entry.preferred) || parsePhones(contact.phones)[0];

  return phone?.value || null;
}

export function getPrimaryEmail(contact: Contact): string | null {
  const email =
    parseEmails(contact.emails).find((entry) => entry.preferred) || parseEmails(contact.emails)[0];

  return email?.value || null;
}

export function contactMatchesQuery(contact: Contact, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const fullName = formatContactName(contact).toLowerCase();
  const primaryPhone = getPrimaryPhone(contact)?.toLowerCase() || "";
  const primaryEmail = getPrimaryEmail(contact)?.toLowerCase() || "";

  return (
    fullName.includes(normalizedQuery) ||
    primaryPhone.includes(normalizedQuery) ||
    primaryEmail.includes(normalizedQuery)
  );
}
