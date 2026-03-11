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

/**
 * Returns 2 initials (first + last name) for an avatar, matching the webapp behaviour.
 */
export function getContactInitials(contact: Contact): string {
  const first = contact.firstName?.trim().charAt(0).toUpperCase() ?? "";
  const last = contact.lastName?.trim().charAt(0).toUpperCase() ?? "";
  return first + last || first || "#";
}

// Mantine default palette shade-6 hex values — matches webapp getAvatarColorFromName order.
const AVATAR_COLOR_PALETTE_HEX = [
  "#228be6", // blue
  "#15aabf", // cyan
  "#12b886", // teal
  "#37b24d", // green
  "#74c417", // lime
  "#f59f00", // yellow
  "#f76707", // orange
  "#f03e3e", // red
  "#e64980", // pink
  "#ae3ec9", // grape
  "#7048e8", // violet
  "#4263eb", // indigo
];

function getAvatarHash(first: string | null | undefined, last: string | null | undefined): number {
  const a = (first || "").trim().toLowerCase();
  const b = (last || "").trim().toLowerCase();
  const normalized = `${a} ${b}`.trim();
  if (!normalized) return 0;
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a deterministic hex color for a contact avatar, using the same
 * hash algorithm and palette as the webapp's getAvatarColorFromName.
 */
export function getAvatarColorHex(contact: Contact): string {
  const hash = getAvatarHash(contact.firstName, contact.lastName);
  return AVATAR_COLOR_PALETTE_HEX[hash % AVATAR_COLOR_PALETTE_HEX.length];
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
