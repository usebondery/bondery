import type { PrismaClient } from "@bondery/db";
import type { ContactAddressEntry, ContactAddressType } from "@bondery/schemas";
import type { ContactWithId } from "../data/select-fragments.js";

const MAX_ADDRESS_ENTRIES = 5;
const CZECHIA_MIN_LATITUDE = 48.4;
const CZECHIA_MAX_LATITUDE = 51.2;
const CZECHIA_MIN_LONGITUDE = 12;
const CZECHIA_MAX_LONGITUDE = 19;

type ContactWithAddresses = {
  addresses: ContactAddressEntry[];
};

function normalizeAddressType(value: unknown): ContactAddressType {
  if (value === "work") {
    return "work";
  }
  if (value === "other") {
    return "other";
  }
  return "home";
}

function normalizeAddressGranularity(value: unknown): "address" | "city" | "state" | "country" {
  if (value === "city") {
    return "city";
  }
  if (value === "state") {
    return "state";
  }
  if (value === "country") {
    return "country";
  }
  return "address";
}

function parseCoordinateValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isWithinCzechiaBounds(latitude: number, longitude: number): boolean {
  return (
    latitude >= CZECHIA_MIN_LATITUDE &&
    latitude <= CZECHIA_MAX_LATITUDE &&
    longitude >= CZECHIA_MIN_LONGITUDE &&
    longitude <= CZECHIA_MAX_LONGITUDE
  );
}

function normalizeCoordinatePair(
  latitude: number | null,
  longitude: number | null,
  countryCode?: string | null,
): { latitude: number | null; longitude: number | null } {
  if (latitude === null || longitude === null) {
    return { latitude: null, longitude: null };
  }

  const directValid = isValidCoordinatePair(latitude, longitude);
  const swappedValid = isValidCoordinatePair(longitude, latitude);

  if (!directValid && !swappedValid) {
    return { latitude: null, longitude: null };
  }

  const normalizedCountryCode = (countryCode ?? "").toUpperCase();
  if (normalizedCountryCode === "CZ" && directValid && swappedValid) {
    const directInside = isWithinCzechiaBounds(latitude, longitude);
    const swappedInside = isWithinCzechiaBounds(longitude, latitude);

    if (!directInside && swappedInside) {
      return { latitude: longitude, longitude: latitude };
    }

    if (directInside && !swappedInside) {
      return { latitude, longitude };
    }
  }

  if (directValid) {
    return { latitude, longitude };
  }

  if (swappedValid) {
    return { latitude: longitude, longitude: latitude };
  }

  return { latitude: null, longitude: null };
}

/** Parses and validates contact address entries from API input payload. */
export function parseAddressEntries(input: unknown): ContactAddressEntry[] {
  if (!Array.isArray(input)) {
    throw new Error("addresses must be an array");
  }

  if (input.length > MAX_ADDRESS_ENTRIES) {
    throw new Error(`addresses can contain at most ${MAX_ADDRESS_ENTRIES} entries`);
  }

  const parsed = input.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`addresses[${index}] must be an object`);
    }

    const maybeValue = (item as Record<string, unknown>)["value"];
    if (typeof maybeValue !== "string" || maybeValue.trim().length === 0) {
      throw new Error(`addresses[${index}].value is required`);
    }

    const maybeLatitude = (item as Record<string, unknown>)["latitude"];
    const maybeLongitude = (item as Record<string, unknown>)["longitude"];

    const latitude = parseCoordinateValue(maybeLatitude);
    const longitude = parseCoordinateValue(maybeLongitude);

    const normalizeNullableText = (value: unknown): string | null => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const countryCode = normalizeNullableText(
      (item as Record<string, unknown>)["addressCountryCode"],
    );
    const normalizedCoordinates = normalizeCoordinatePair(latitude, longitude, countryCode);

    return {
      addressCity: normalizeNullableText((item as Record<string, unknown>)["addressCity"]),
      addressCountry: normalizeNullableText((item as Record<string, unknown>)["addressCountry"]),
      addressCountryCode: countryCode,
      addressFormatted: normalizeNullableText(
        (item as Record<string, unknown>)["addressFormatted"],
      ),
      addressGeocodeSource: normalizeNullableText(
        (item as Record<string, unknown>)["addressGeocodeSource"],
      ) as ContactAddressEntry["addressGeocodeSource"],
      addressGranularity: normalizeAddressGranularity(
        (item as Record<string, unknown>)["addressGranularity"],
      ),
      addressLine1: normalizeNullableText((item as Record<string, unknown>)["addressLine1"]),
      addressLine2: normalizeNullableText((item as Record<string, unknown>)["addressLine2"]),
      addressPostalCode: normalizeNullableText(
        (item as Record<string, unknown>)["addressPostalCode"],
      ),
      addressState: normalizeNullableText((item as Record<string, unknown>)["addressState"]),
      addressStateCode: normalizeNullableText(
        (item as Record<string, unknown>)["addressStateCode"],
      ),
      geocodeConfidence: null,
      label: normalizeNullableText((item as Record<string, unknown>)["label"]),
      latitude: normalizedCoordinates.latitude,
      longitude: normalizedCoordinates.longitude,
      timezone: normalizeNullableText((item as Record<string, unknown>)["timezone"]),
      type: normalizeAddressType((item as Record<string, unknown>)["type"]),
      value: maybeValue.trim(),
    } as ContactAddressEntry;
  });

  return parsed;
}

/** Loads normalized address rows for people and merges them into contact-shaped objects. */
export async function attachContactAddresses<T extends ContactWithId>(
  db: PrismaClient,
  userId: string,
  contacts: T[],
): Promise<Array<T & ContactWithAddresses>> {
  if (contacts.length === 0) {
    return [];
  }

  const personIds = contacts.map((contact) => contact.id);

  const addressRows = await db.peopleAddress.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      addressCity: true,
      addressCountry: true,
      addressCountryCode: true,
      addressFormatted: true,
      addressGeocodeSource: true,
      addressGranularity: true,
      addressLine1: true,
      addressLine2: true,
      addressPostalCode: true,
      addressState: true,
      addressStateCode: true,
      geocodeConfidence: true,
      label: true,
      latitude: true,
      longitude: true,
      personId: true,
      timezone: true,
      type: true,
      value: true,
    },
    where: { personId: { in: personIds }, userId },
  });

  const byPerson = new Map<string, ContactAddressEntry[]>();
  for (const contact of contacts) {
    byPerson.set(contact.id, []);
  }

  for (const row of addressRows) {
    const bucket = byPerson.get(row.personId);
    if (!bucket) {
      continue;
    }

    const normalizedCoordinates = normalizeCoordinatePair(
      row.latitude,
      row.longitude,
      row.addressCountryCode,
    );

    bucket.push({
      addressCity: row.addressCity,
      addressCountry: row.addressCountry,
      addressCountryCode: row.addressCountryCode,
      addressFormatted: row.addressFormatted,
      addressGeocodeSource: row.addressGeocodeSource as ContactAddressEntry["addressGeocodeSource"],
      addressGranularity: normalizeAddressGranularity(row.addressGranularity),
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      addressPostalCode: row.addressPostalCode,
      addressState: row.addressState,
      addressStateCode: row.addressStateCode,
      geocodeConfidence: row.geocodeConfidence as ContactAddressEntry["geocodeConfidence"],
      label: row.label,
      latitude: normalizedCoordinates.latitude,
      longitude: normalizedCoordinates.longitude,
      timezone: row.timezone,
      type: normalizeAddressType(row.type),
      value: row.value,
    });
  }

  return contacts.map((contact) => ({
    ...contact,
    addresses: byPerson.get(contact.id) ?? [],
  }));
}

/** Replaces all address rows for a person with the provided ordered entries. */
export async function replaceContactAddresses(
  db: PrismaClient,
  userId: string,
  personId: string,
  addresses: ContactAddressEntry[],
): Promise<void> {
  await db.peopleAddress.deleteMany({
    where: { personId, userId },
  });

  if (addresses.length === 0) {
    return;
  }

  await db.peopleAddress.createMany({
    data: addresses.map((address, index) => ({
      addressCity: address.addressCity,
      addressCountry: address.addressCountry,
      addressCountryCode: address.addressCountryCode,
      addressFormatted: address.addressFormatted,
      addressGeocodeSource: address.addressGeocodeSource,
      addressGranularity: address.addressGranularity,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      addressPostalCode: address.addressPostalCode,
      addressState: address.addressState,
      addressStateCode: address.addressStateCode,
      geocodeConfidence: address.geocodeConfidence,
      label: address.label,
      latitude: address.latitude,
      longitude: address.longitude,
      personId,
      sortOrder: index,
      timezone: address.timezone,
      type: address.type,
      userId,
      value: address.value,
    })),
  });
}
