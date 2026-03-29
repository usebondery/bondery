import { cleanPersonName, extractNameParts, SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import type { Contact, ContactAddressEntry, EmailEntry, PhoneEntry } from "@bondery/types";
import type {
  VCard,
  VCardContactDraft,
  VCardPhone,
  VCardProperty,
  VCardTextValue,
} from "./model.js";

function normalizePreferred(pref?: number): boolean {
  return pref === 1;
}

function mapTextTypeToContactType(types: string[]): "home" | "work" {
  return types.includes("work") ? "work" : "home";
}

function splitPhoneUri(uri: string): { prefix: string; value: string } {
  const normalized = uri.startsWith("tel:") ? uri.slice(4) : uri;
  // Match an international prefix (+1 to +999) followed by the rest of the number.
  // The prefix is the country code only (1-3 digits after +), not the entire number.
  const match = normalized.match(/^(\+\d{1,3})[-\s]?(.+)$/);
  if (!match) {
    return { prefix: "", value: normalized };
  }
  return {
    prefix: match[1],
    value: match[2].replace(/^[-\s]+/, ""),
  };
}

function buildStructuredName(contact: Contact) {
  return {
    familyNames: contact.lastName ? [contact.lastName] : [],
    givenNames: contact.firstName ? [contact.firstName] : [],
    additionalNames: contact.middleName ? [contact.middleName] : [],
    honorificPrefixes: [],
    honorificSuffixes: [],
  };
}

function mapPhones(phones: PhoneEntry[] | null): VCardPhone[] {
  if (!phones) {
    return [];
  }

  return phones
    .filter((phone) => phone.value.trim())
    .map((phone) => ({
      value: `${phone.prefix}${phone.value.trim()}`,
      uri: `tel:${phone.prefix}${phone.value.trim()}`,
      pref: phone.preferred ? 1 : undefined,
      types: [phone.type, "voice"],
    }));
}

function mapEmails(emails: EmailEntry[] | null): VCardTextValue[] {
  if (!emails) {
    return [];
  }

  return emails
    .filter((email) => email.value.trim())
    .map((email) => ({
      value: email.value.trim(),
      pref: email.preferred ? 1 : undefined,
      types: [email.type],
    }));
}

function mapAddresses(addresses: ContactAddressEntry[] | null) {
  const addressEntries = addresses ?? [];

  return addressEntries.map((address) => ({
    poBox: [],
    extended: address.addressLine2 ? [address.addressLine2] : [],
    street: address.addressLine1 ? [address.addressLine1] : address.value ? [address.value] : [],
    locality: address.addressCity ? [address.addressCity] : [],
    region: address.addressState ? [address.addressState] : [],
    postalCode: address.addressPostalCode ? [address.addressPostalCode] : [],
    country: address.addressCountry ? [address.addressCountry] : [],
    types: [address.type],
    geo:
      address.latitude !== null && address.longitude !== null
        ? `geo:${address.latitude},${address.longitude}`
        : undefined,
  }));
}

function mapSocialImpp(contact: Contact): VCardTextValue[] {
  const entries: VCardTextValue[] = [];

  if (contact.whatsapp) {
    entries.push({ value: `whatsapp:${contact.whatsapp}`, types: ["home"] });
    entries.push({
      value: `https://wa.me/${contact.whatsapp.replace(/^\+/, "")}`,
      types: ["home"],
    });
  }

  if (contact.signal) {
    entries.push({ value: `signal:${contact.signal}`, types: ["home"] });
    entries.push({
      value: `https://signal.me/#p/${contact.signal.replace(/^\+/, "")}`,
      types: ["home"],
    });
  }

  if (contact.linkedin) {
    const value = contact.linkedin.startsWith("http")
      ? contact.linkedin
      : `${SOCIAL_PLATFORM_URL_DETAILS.linkedin.profileBaseUrl}${contact.linkedin}`;
    entries.push({ value, types: ["work"] });
  }

  if (contact.instagram) {
    entries.push({ value: `instagram:${contact.instagram}`, types: ["home"] });
    entries.push({
      value: `${SOCIAL_PLATFORM_URL_DETAILS.instagram.profileBaseUrl}${contact.instagram}`,
      types: ["home"],
    });
  }

  if (contact.facebook) {
    entries.push({ value: `messenger:${contact.facebook}`, types: ["home"] });
    entries.push({ value: `https://m.me/${contact.facebook}`, types: ["home"] });
  }

  return entries;
}

/**
 * Maps a Bondery contact into a normalized vCard model.
 *
 * @param contact Contact entity from the shared domain model.
 * @returns Normalized vCard ready for serialization or enrichment.
 */
export function contactToVCard(contact: Contact): VCard {
  const fullName = [contact.firstName, contact.middleName, contact.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const phoneEntries = Array.isArray(contact.phones) ? (contact.phones as PhoneEntry[]) : null;
  const emailEntries = Array.isArray(contact.emails) ? (contact.emails as EmailEntry[]) : null;
  const addressEntries = Array.isArray(contact.addresses)
    ? (contact.addresses as ContactAddressEntry[])
    : null;

  return {
    kind: "individual",
    fullName,
    name: buildStructuredName(contact),
    nicknames: [],
    phones: mapPhones(phoneEntries),
    emails: mapEmails(emailEntries),
    addresses: mapAddresses(addressEntries),
    instantMessaging: mapSocialImpp(contact),
    urls: contact.website ? [{ value: contact.website, types: ["home"] }] : [],
    languages: contact.language ? [{ value: contact.language, pref: 1, types: [] }] : [],
    titles: contact.headline ? [{ value: contact.headline, types: [] }] : [],
    roles: [],
    organizations: [],
    notes: contact.notes ? [{ value: contact.notes, types: [] }] : [],
    categories: [],
    photos: [],
    logos: [],
    sounds: [],
    keys: [],
    related: contact.myself
      ? [{ value: `urn:uuid:${contact.id}`, valueType: "uri", types: ["me"] }]
      : [],
    timezone: contact.timezone ? { value: contact.timezone, valueType: "text" } : undefined,
    geo:
      contact.latitude !== null && contact.longitude !== null
        ? `geo:${contact.latitude},${contact.longitude}`
        : undefined,
    uid: `urn:uuid:${contact.id}`,
    revision: contact.updatedAt ?? contact.createdAt,
    productId: "-//BONDERY//NONSGML Bondery v1.0//EN",
    raw: {
      version: "4.0",
      properties: [],
      warnings: [],
    },
    customProperties: contact.myself
      ? [{ name: "X-MYSELF", parameters: [], value: "TRUE" }]
      : [],
  };
}

function deriveName(card: VCard): {
  firstName: string;
  middleName: string | null;
  lastName: string | null;
} {
  if (card.name) {
    return {
      firstName: card.name.givenNames[0] ?? "",
      middleName: card.name.additionalNames[0] ?? null,
      lastName: card.name.familyNames[0] ?? null,
    };
  }

  const cleaned = cleanPersonName(card.fullName);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", middleName: null, lastName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: null, lastName: null };
  }

  const extracted = extractNameParts(parts.slice(1).join(" "));
  return {
    firstName: parts[0],
    middleName: extracted.middleName,
    lastName: extracted.lastName || null,
  };
}

function pickBestUrl(values: VCardTextValue[]): string | null {
  return values.sort((left, right) => (left.pref ?? 100) - (right.pref ?? 100))[0]?.value ?? null;
}

/**
 * Maps Android contact event type codes to Bondery important date types.
 * Android type codes: 0=custom (with label), 1=anniversary, 2=other, 3=birthday
 * Reference: ContactsContract.CommonDataKinds.Event
 *
 * @param typeCode Numeric type from X-ANDROID-CUSTOM field
 * @returns Bondery date type
 */
function mapAndroidEventType(
  typeCode: number,
): "birthday" | "anniversary" | "nameday" | "graduation" | "other" {
  switch (typeCode) {
    case 0:
      return "other"; // TYPE_CUSTOM - use label field
    case 1:
      return "anniversary"; // TYPE_ANNIVERSARY
    case 2:
      return "other"; // TYPE_OTHER
    case 3:
      return "birthday"; // TYPE_BIRTHDAY
    default:
      return "other";
  }
}

/**
 * Normalizes a vCard date string, handling year-less recurring dates.
 * Year-less dates (--MM-DD) are stored with epoch year 1904.
 *
 * @param dateStr Date string from vCard (YYYY-MM-DD or --MM-DD)
 * @returns Normalized date string (YYYY-MM-DD)
 */
function normalizeVCardDate(dateStr: string): string {
  if (dateStr.startsWith("--")) {
    // Recurring date without year: --MM-DD → 1904-MM-DD
    // Year 1904 is used as a sentinel value (database epoch convention)
    return `1904-${dateStr.slice(2)}`;
  }
  return dateStr;
}

/**
 * Parses X-ANDROID-CUSTOM contact_event property into an important date entry.
 * Format: vnd.android.cursor.item/contact_event;DATE;TYPE;LABEL;...
 *
 * @param property vCard property with X-ANDROID-CUSTOM name
 * @returns Parsed date entry or null if invalid
 */
function parseAndroidCustomDate(property: VCardProperty): {
  type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
  date: string;
  note: string | null;
} | null {
  const value = property.value.trim();
  if (!value.startsWith("vnd.android.cursor.item/contact_event")) {
    return null;
  }

  const parts = value.split(";");
  if (parts.length < 3) return null;

  const dateStr = parts[1]?.trim();
  if (!dateStr || dateStr === "") return null;

  const typeCode = Number.parseInt(parts[2] ?? "1", 10);
  // More explicit handling of empty label field
  const labelValue = parts[3];
  const label = labelValue && labelValue.trim() !== "" ? labelValue.trim() : null;

  try {
    const normalizedDate = normalizeVCardDate(dateStr);
    // Basic validation: check if date can be parsed
    const testDate = new Date(normalizedDate);
    if (isNaN(testDate.getTime())) {
      return null;
    }

    const mappedType = mapAndroidEventType(typeCode);

    return {
      type: mappedType,
      date: normalizedDate,
      note: label,
    };
  } catch {
    return null;
  }
}

/**
 * Maps a normalized vCard into a contact-shaped draft suitable for import flows.
 *
 * @param card Parsed and normalized vCard.
 * @returns Contact-shaped draft without repository-specific identifiers.
 */
export function vCardToContactDraft(card: VCard): VCardContactDraft {
  const name = deriveName(card);
  const bestWebsite = pickBestUrl(card.urls);
  const bestPhoto =
    card.photos.sort((left, right) => (left.pref ?? 100) - (right.pref ?? 100))[0]?.uri ?? null;
  const bestNote =
    card.notes.sort((left, right) => (left.pref ?? 100) - (right.pref ?? 100))[0]?.value ?? null;
  const bestTitle =
    card.titles.sort((left, right) => (left.pref ?? 100) - (right.pref ?? 100))[0]?.value ?? null;
  const bestOrg =
    card.organizations.sort((left, right) => (left.pref ?? 100) - (right.pref ?? 100))[0]
      ?.values[0] ?? null;
  const headline = [bestTitle, bestOrg ? `@${bestOrg}` : null].filter(Boolean).join(" ") || null;
  const bestLanguage =
    card.languages.sort((left, right) => (left.pref ?? 100) - (right.pref ?? 100))[0]?.value ??
    null;
  const geoMatch = card.geo?.match(/^geo:([^,]+),(.+)$/);
  const imppValues = card.instantMessaging.map((entry) => entry.value);

  return {
    firstName: name.firstName,
    middleName: name.middleName,
    lastName: name.lastName,
    headline: headline,
    notes: bestNote,
    website: bestWebsite,
    language: bestLanguage,
    timezone: card.timezone?.value ?? null,
    latitude: geoMatch ? Number.parseFloat(geoMatch[1]) : null,
    longitude: geoMatch ? Number.parseFloat(geoMatch[2]) : null,
    emails: card.emails.map((email) => ({
      value: email.value,
      type: mapTextTypeToContactType(email.types),
      preferred: normalizePreferred(email.pref),
    })),
    phones: card.phones.map((phone) => {
      const split = splitPhoneUri(phone.uri);
      return {
        prefix: split.prefix,
        value: split.value || phone.value,
        type: mapTextTypeToContactType(phone.types),
        preferred: normalizePreferred(phone.pref),
      };
    }),
    addresses: card.addresses.map((address) => ({
      value: [address.street[0], address.locality[0], address.region[0], address.country[0]]
        .filter(Boolean)
        .join(", "),
      type: address.types.includes("work")
        ? "work"
        : address.types.includes("home")
          ? "home"
          : "other",
      preferred: normalizePreferred(address.pref),
      addressLine1: address.street[0] ?? null,
      addressLine2: address.extended[0] ?? null,
      addressCity: address.locality[0] ?? null,
      addressPostalCode: address.postalCode[0] ?? null,
      addressState: address.region[0] ?? null,
      addressCountry: address.country[0] ?? null,
      latitude: address.geo?.startsWith("geo:")
        ? Number.parseFloat(address.geo.slice(4).split(",")[0] ?? "")
        : null,
      longitude: address.geo?.startsWith("geo:")
        ? Number.parseFloat(address.geo.slice(4).split(",")[1] ?? "")
        : null,
    })),
    linkedin: imppValues.find((value) => value.includes("linkedin.com/")) ?? null,
    instagram:
      imppValues.find((value) => value.startsWith("instagram:"))?.slice("instagram:".length) ??
      null,
    whatsapp:
      imppValues.find((value) => value.startsWith("whatsapp:"))?.slice("whatsapp:".length) ?? null,
    facebook:
      imppValues.find((value) => value.startsWith("messenger:"))?.slice("messenger:".length) ??
      null,
    signal:
      imppValues.find((value) => value.startsWith("signal:"))?.slice("signal:".length) ?? null,
    avatarUri: bestPhoto,
    importantDates: extractImportantDates(card),
    raw: card.raw,
  };
}

/**
 * Extracts all important dates from a vCard (birthday, anniversary, X-ANDROID-CUSTOM).
 * Normalizes year-less dates to use epoch year 1904.
 *
 * @param card Parsed vCard
 * @returns Array of important dates or null if none found
 */
function extractImportantDates(card: VCard): Array<{
  type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
  date: string;
  note: string | null;
}> | null {
  const dates: Array<{
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
    note: string | null;
  }> = [];

  // Extract standard BDAY field
  if (card.birthday?.value) {
    try {
      const normalizedDate = normalizeVCardDate(card.birthday.value);
      const testDate = new Date(normalizedDate);
      if (!isNaN(testDate.getTime())) {
        dates.push({
          type: "birthday",
          date: normalizedDate,
          note: null,
        });
      }
    } catch {
      // Skip invalid birthday
    }
  }

  // Extract standard ANNIVERSARY field
  if (card.anniversary?.value) {
    try {
      const normalizedDate = normalizeVCardDate(card.anniversary.value);
      const testDate = new Date(normalizedDate);
      if (!isNaN(testDate.getTime())) {
        dates.push({
          type: "anniversary",
          date: normalizedDate,
          note: null,
        });
      }
    } catch {
      // Skip invalid anniversary
    }
  }

  // Extract X-ANDROID-CUSTOM contact_event fields
  const androidDates = card.customProperties
    .filter((prop) => prop.name === "X-ANDROID-CUSTOM")
    .map((prop) => parseAndroidCustomDate(prop))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  dates.push(...androidDates);

  return dates.length > 0 ? dates : null;
}
