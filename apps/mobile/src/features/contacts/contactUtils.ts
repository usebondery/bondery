import { abbreviateLocationCountry, formatAddressLabel } from "@bondery/helpers/address";
import { formatContactName } from "@bondery/helpers/contact";
import { combinePhoneNumber, formatPhoneNumber } from "@bondery/helpers/phone";
import type { Contact, ContactAddressEntry, EmailEntry, PhoneEntry } from "@bondery/schemas";
import { MS_PER_DAY } from "../../lib/config";
import i18n from "../../lib/i18n/i18n";
import { AVATAR_COLOR_PALETTE_HEX } from "../../theme/colors";
import { formatImportantDate, isYearlessDate, resolveDateLocale } from "./importantDateUtils";

export { formatContactName };

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

function getAvatarHash(first: string | null | undefined, last: string | null | undefined): number {
  const a = (first || "").trim().toLowerCase();
  const b = (last || "").trim().toLowerCase();
  const normalized = `${a} ${b}`.trim();
  if (!normalized) {
    return 0;
  }
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

export function getPrimaryPhoneEntry(contact: Contact): PhoneEntry | null {
  const phones = parseContactPhones(contact);
  return phones.find((entry) => entry.preferred) ?? phones[0] ?? null;
}

export function getPrimaryEmail(contact: Contact): string | null {
  const email = getPrimaryEmailEntry(contact);
  return email?.value || null;
}

export function getPrimaryEmailEntry(contact: Contact): EmailEntry | null {
  const emails = parseContactEmails(contact);
  return emails.find((entry) => entry.preferred) ?? emails[0] ?? null;
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

/** Whole days elapsed since an ISO date string (local calendar day diff). */
export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY);
}

export function formatRelativeDate(dateStr: string): string {
  const diffDays = daysSince(dateStr);
  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) {
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) {
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

export function formatAbsoluteDate(dateStr: string): string {
  const locale = resolveDateLocale(i18n.language);

  if (isYearlessDate(dateStr)) {
    return formatImportantDate(dateStr, locale);
  }

  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Relative timestamp for notes "last edited" — fine-grained for recent edits, shared day logic beyond. */
export function formatRelativeEditedAt(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) {
    return "Edited just now";
  }
  if (diffMin < 60) {
    return `Edited ${diffMin}m ago`;
  }
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    return `Edited ${diffH}h ago`;
  }

  const relative = formatRelativeDate(dateStr);
  if (relative === "Today") {
    return "Edited today";
  }
  if (relative === "Yesterday") {
    return "Edited yesterday";
  }
  return `Edited ${relative}`;
}

function parseAddresses(addresses: Contact["addresses"]): ContactAddressEntry[] {
  if (!Array.isArray(addresses)) {
    return [];
  }

  return addresses.filter((entry): entry is ContactAddressEntry => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    return typeof (entry as ContactAddressEntry).value === "string";
  });
}

export function getContactAddresses(contact: Contact): ContactAddressEntry[] {
  return parseAddresses(contact.addresses).filter(
    (address) => formatDisplayAddress(address).length > 0,
  );
}

export function formatDisplayPhone(phone: PhoneEntry): string {
  const combined = combinePhoneNumber(phone.prefix || "+1", phone.value);
  return formatPhoneNumber(combined) || combined;
}

export function formatDisplayAddress(address: ContactAddressEntry): string {
  if (address.addressFormatted?.trim()) {
    return address.addressFormatted.trim();
  }

  const formatted = formatAddressLabel({
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    city: address.addressCity,
    countryCode: address.addressCountryCode,
    postalCode: address.addressPostalCode,
    state: address.addressState,
  });

  if (formatted) {
    return formatted;
  }

  return address.value?.trim() ?? "";
}

export interface AddressCardLines {
  cityLine: string;
  countryCode: string | null;
  countryName: string | null;
  streetLine: string;
}

function getCountryDisplayName(countryCode: string | null | undefined): string | null {
  if (!countryCode?.trim() || countryCode.length !== 2) {
    return null;
  }

  try {
    const locale = resolveDateLocale();
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return names.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

export function formatAddressCardLines(address: ContactAddressEntry): AddressCardLines {
  const streetParts = [address.addressLine1?.trim(), address.addressLine2?.trim()].filter(
    Boolean,
  ) as string[];
  let streetLine = streetParts.join("\n");

  const city = address.addressCity?.trim() ?? "";
  const postalCode = address.addressPostalCode?.trim() ?? "";
  const cityLine = [city, postalCode].filter(Boolean).join(" ");

  const countryCode = address.addressCountryCode?.trim() || null;
  const countryName = address.addressCountry?.trim() || getCountryDisplayName(countryCode) || null;

  if (!streetLine && !cityLine) {
    const fallback = formatDisplayAddress(address);
    if (fallback) {
      streetLine = fallback;
    }
  }

  return {
    cityLine,
    countryCode,
    countryName,
    streetLine,
  };
}

export function formatContactLocation(contact: Contact): string | null {
  const abbreviated = abbreviateLocationCountry(contact.location);
  return abbreviated || null;
}

export function parseContactPhones(contact: Contact): PhoneEntry[] {
  return parsePhones(contact.phones).filter((phone) => phone.value.trim().length > 0);
}

export function parseContactEmails(contact: Contact): EmailEntry[] {
  return parseEmails(contact.emails).filter((email) => email.value.trim().length > 0);
}
