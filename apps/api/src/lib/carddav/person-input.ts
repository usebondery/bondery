import type { ImportantDateType, SocialPlatform } from "@bondery/schemas";
import {
  type CardAddressType,
  type CardDavPersonInput,
  type CardEmailInputType,
  type CardExtras,
  type CardPhoneInputType,
  emptyCardExtras,
} from "@bondery/vcard";

const ISO_DATE_LENGTH = 10;

const PHONE_TYPES = new Set<string>(["mobile", "home", "work"] satisfies CardPhoneInputType[]);
const EMAIL_TYPES = new Set<string>(["personal", "home", "work"] satisfies CardEmailInputType[]);
const ADDRESS_TYPES = new Set<string>(["home", "work", "other"] satisfies CardAddressType[]);
const SOCIAL_PLATFORMS = new Set<string>([
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
] satisfies SocialPlatform[]);
const DATE_TYPES = new Set<string>([
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
] satisfies ImportantDateType[]);

/** A `people` row with the child rows a card needs. */
interface PersonCardRow {
  addresses: {
    addressCity: string | null;
    addressCountry: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressPostalCode: string | null;
    addressState: string | null;
    label: string | null;
    type: string;
  }[];
  avatarUpdatedAt: Date | null;
  emails: { preferred: boolean; sortOrder: number; type: string; value: string }[];
  firstName: string;
  hasAvatar: boolean;
  headline: string | null;
  id: string;
  importantDates: { date: Date; note: string | null; type: string }[];
  lastName: string | null;
  middleName: string | null;
  phones: { preferred: boolean; prefix: string; sortOrder: number; type: string; value: string }[];
  socials: { handle: string; platform: string }[];
}

function pick<T extends string>(allowed: Set<string>, value: string, fallback: T): T {
  return allowed.has(value) ? (value as T) : fallback;
}

/**
 * The avatar timestamp that versions the card photo, or null when the person has no avatar.
 * `setContactHasAvatar` clears it together with `has_avatar`.
 */
function photoVersionOf(person: { avatarUpdatedAt: Date | null; hasAvatar: boolean }): Date | null {
  return person.hasAvatar ? person.avatarUpdatedAt : null;
}

/** Maps database rows to the narrow input of `projectCard`. Unknown enum values fall back. */
function toCardInput(person: PersonCardRow): CardDavPersonInput {
  return {
    addresses: person.addresses.map((address) => ({
      city: address.addressCity,
      country: address.addressCountry,
      label: address.label,
      line1: address.addressLine1,
      line2: address.addressLine2,
      postalCode: address.addressPostalCode,
      state: address.addressState,
      type: pick(ADDRESS_TYPES, address.type, "other"),
    })),
    emails: person.emails.map((email) => ({
      preferred: email.preferred,
      sortOrder: email.sortOrder,
      type: pick(EMAIL_TYPES, email.type, "personal"),
      value: email.value,
    })),
    firstName: person.firstName,
    headline: person.headline,
    id: person.id,
    importantDates: person.importantDates.map((entry) => ({
      date: entry.date.toISOString().slice(0, ISO_DATE_LENGTH),
      note: entry.note,
      type: pick(DATE_TYPES, entry.type, "other"),
    })),
    lastName: person.lastName,
    middleName: person.middleName,
    phones: person.phones.map((phone) => ({
      preferred: phone.preferred,
      prefix: phone.prefix,
      sortOrder: phone.sortOrder,
      type: pick(PHONE_TYPES, phone.type, "mobile"),
      value: phone.value,
    })),
    photoVersion: photoVersionOf(person)?.toISOString() ?? null,
    socials: person.socials.flatMap((social) =>
      SOCIAL_PLATFORMS.has(social.platform)
        ? [{ handle: social.handle, platform: social.platform as SocialPlatform }]
        : [],
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVCardProperty(value: unknown): value is CardExtras["properties"][number] {
  return (
    isRecord(value) &&
    typeof value["name"] === "string" &&
    typeof value["value"] === "string" &&
    Array.isArray(value["parameters"]) &&
    (value["group"] === undefined || typeof value["group"] === "string")
  );
}

/**
 * Reads `people_vcard_extras.properties`. The column holds a `CardExtras` object. A missing row
 * (null), or a value of any other shape, means empty extras, so a malformed row never breaks a
 * card.
 */
function parseStoredExtras(value: unknown): CardExtras {
  if (!(isRecord(value) && Array.isArray(value["properties"]))) {
    return emptyCardExtras();
  }
  return {
    namePrefix: typeof value["namePrefix"] === "string" ? value["namePrefix"] : "",
    nameSuffix: typeof value["nameSuffix"] === "string" ? value["nameSuffix"] : "",
    properties: value["properties"].filter(isVCardProperty),
  };
}

export type { PersonCardRow };
export { parseStoredExtras, photoVersionOf, toCardInput };
