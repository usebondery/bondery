import { cleanPersonName, extractNameParts, SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import type { Contact, ContactAddressEntry, EmailEntry, PhoneEntry } from "@bondery/schemas";
import type {
  VCard,
  VCardContactDraft,
  VCardPhone,
  VCardProperty,
  VCardTextValue,
} from "#model.js";

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
    additionalNames: contact.middleName ? [contact.middleName] : [],
    familyNames: contact.lastName ? [contact.lastName] : [],
    givenNames: contact.firstName ? [contact.firstName] : [],
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
      pref: phone.preferred ? 1 : undefined,
      types: [phone.type, "voice"],
      uri: `tel:${phone.prefix}${phone.value.trim()}`,
      value: `${phone.prefix}${phone.value.trim()}`,
    }));
}

function mapEmails(emails: EmailEntry[] | null): VCardTextValue[] {
  if (!emails) {
    return [];
  }

  return emails
    .filter((email) => email.value.trim())
    .map((email) => ({
      pref: email.preferred ? 1 : undefined,
      types: [email.type],
      value: email.value.trim(),
    }));
}

function mapAddresses(addresses: ContactAddressEntry[] | null) {
  const addressEntries = addresses ?? [];

  return addressEntries.map((address) => ({
    country: address.addressCountry ? [address.addressCountry] : [],
    extended: address.addressLine2 ? [address.addressLine2] : [],
    geo:
      address.latitude !== null && address.longitude !== null
        ? `geo:${address.latitude},${address.longitude}`
        : undefined,
    locality: address.addressCity ? [address.addressCity] : [],
    poBox: [],
    postalCode: address.addressPostalCode ? [address.addressPostalCode] : [],
    region: address.addressState ? [address.addressState] : [],
    street: address.addressLine1 ? [address.addressLine1] : address.value ? [address.value] : [],
    types: [address.type],
  }));
}

function mapSocialImpp(contact: Contact): VCardTextValue[] {
  const entries: VCardTextValue[] = [];

  if (contact.whatsapp) {
    entries.push({ types: ["home"], value: `whatsapp:${contact.whatsapp}` });
    entries.push({
      types: ["home"],
      value: `https://wa.me/${contact.whatsapp.replace(/^\+/, "")}`,
    });
  }

  if (contact.signal) {
    entries.push({ types: ["home"], value: `signal:${contact.signal}` });
    entries.push({
      types: ["home"],
      value: `https://signal.me/#p/${contact.signal.replace(/^\+/, "")}`,
    });
  }

  if (contact.linkedin) {
    const value = contact.linkedin.startsWith("http")
      ? contact.linkedin
      : `${SOCIAL_PLATFORM_URL_DETAILS.linkedin.profileBaseUrl}${contact.linkedin}`;
    entries.push({ types: ["work"], value });
  }

  if (contact.instagram) {
    entries.push({ types: ["home"], value: `instagram:${contact.instagram}` });
    entries.push({
      types: ["home"],
      value: `${SOCIAL_PLATFORM_URL_DETAILS.instagram.profileBaseUrl}${contact.instagram}`,
    });
  }

  if (contact.facebook) {
    entries.push({ types: ["home"], value: `messenger:${contact.facebook}` });
    entries.push({ types: ["home"], value: `https://m.me/${contact.facebook}` });
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
    addresses: mapAddresses(addressEntries),
    categories: [],
    customProperties: contact.myself ? [{ name: "X-MYSELF", parameters: [], value: "TRUE" }] : [],
    emails: mapEmails(emailEntries),
    fullName,
    geo:
      contact.latitude !== null && contact.longitude !== null
        ? `geo:${contact.latitude},${contact.longitude}`
        : undefined,
    instantMessaging: mapSocialImpp(contact),
    keys: [],
    kind: "individual",
    languages: contact.language ? [{ pref: 1, types: [], value: contact.language }] : [],
    logos: [],
    name: buildStructuredName(contact),
    nicknames: [],
    notes: contact.notes ? [{ types: [], value: contact.notes }] : [],
    organizations: [],
    phones: mapPhones(phoneEntries),
    photos: [],
    productId: "-//BONDERY//NONSGML Bondery v1.0//EN",
    raw: {
      properties: [],
      version: "4.0",
      warnings: [],
    },
    related: contact.myself
      ? [{ types: ["me"], value: `urn:uuid:${contact.id}`, valueType: "uri" }]
      : [],
    revision: contact.updatedAt ?? contact.createdAt ?? undefined,
    roles: [],
    sounds: [],
    timezone: contact.timezone ? { value: contact.timezone, valueType: "text" } : undefined,
    titles: contact.headline ? [{ types: [], value: contact.headline }] : [],
    uid: `urn:uuid:${contact.id}`,
    urls: contact.website ? [{ types: ["home"], value: contact.website }] : [],
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
      lastName: card.name.familyNames[0] ?? null,
      middleName: card.name.additionalNames[0] ?? null,
    };
  }

  const cleaned = cleanPersonName(card.fullName);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: null, middleName: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null, middleName: null };
  }

  const extracted = extractNameParts(parts.slice(1).join(" "));
  return {
    firstName: parts[0],
    lastName: extracted.lastName || null,
    middleName: extracted.middleName,
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
  if (parts.length < 3) {
    return null;
  }

  const dateStr = parts[1]?.trim();
  if (!dateStr || dateStr === "") {
    return null;
  }

  const typeCode = Number.parseInt(parts[2] ?? "1", 10);
  // More explicit handling of empty label field
  const labelValue = parts[3];
  const label = labelValue && labelValue.trim() !== "" ? labelValue.trim() : null;

  try {
    const normalizedDate = normalizeVCardDate(dateStr);
    // Basic validation: check if date can be parsed
    const testDate = new Date(normalizedDate);
    if (Number.isNaN(testDate.getTime())) {
      return null;
    }

    const mappedType = mapAndroidEventType(typeCode);

    return {
      date: normalizedDate,
      note: label,
      type: mappedType,
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
    addresses: card.addresses.map((address) => ({
      addressCity: address.locality[0] ?? null,
      addressCountry: address.country[0] ?? null,
      addressLine1: address.street[0] ?? null,
      addressLine2: address.extended[0] ?? null,
      addressPostalCode: address.postalCode[0] ?? null,
      addressState: address.region[0] ?? null,
      latitude: address.geo?.startsWith("geo:")
        ? Number.parseFloat(address.geo.slice(4).split(",")[0] ?? "")
        : null,
      longitude: address.geo?.startsWith("geo:")
        ? Number.parseFloat(address.geo.slice(4).split(",")[1] ?? "")
        : null,
      preferred: normalizePreferred(address.pref),
      type: address.types.includes("work")
        ? "work"
        : address.types.includes("home")
          ? "home"
          : "other",
      value: [address.street[0], address.locality[0], address.region[0], address.country[0]]
        .filter(Boolean)
        .join(", "),
    })),
    avatarUri: bestPhoto,
    emails: card.emails.map((email) => ({
      preferred: normalizePreferred(email.pref),
      type: mapTextTypeToContactType(email.types),
      value: email.value,
    })),
    facebook:
      imppValues.find((value) => value.startsWith("messenger:"))?.slice("messenger:".length) ??
      null,
    firstName: name.firstName,
    headline: headline,
    importantDates: extractImportantDates(card),
    instagram:
      imppValues.find((value) => value.startsWith("instagram:"))?.slice("instagram:".length) ??
      null,
    language: bestLanguage,
    lastName: name.lastName,
    latitude: geoMatch ? Number.parseFloat(geoMatch[1]) : null,
    linkedin: imppValues.find((value) => value.includes("linkedin.com/")) ?? null,
    longitude: geoMatch ? Number.parseFloat(geoMatch[2]) : null,
    middleName: name.middleName,
    notes: bestNote,
    phones: card.phones.map((phone) => {
      const split = splitPhoneUri(phone.uri);
      return {
        preferred: normalizePreferred(phone.pref),
        prefix: split.prefix,
        type: mapTextTypeToContactType(phone.types),
        value: split.value || phone.value,
      };
    }),
    raw: card.raw,
    signal:
      imppValues.find((value) => value.startsWith("signal:"))?.slice("signal:".length) ?? null,
    timezone: card.timezone?.value ?? null,
    website: bestWebsite,
    whatsapp:
      imppValues.find((value) => value.startsWith("whatsapp:"))?.slice("whatsapp:".length) ?? null,
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
      if (!Number.isNaN(testDate.getTime())) {
        dates.push({
          date: normalizedDate,
          note: null,
          type: "birthday",
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
      if (!Number.isNaN(testDate.getTime())) {
        dates.push({
          date: normalizedDate,
          note: null,
          type: "anniversary",
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
