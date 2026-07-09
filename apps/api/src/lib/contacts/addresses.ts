import type { ContactAddressEntry, ContactAddressType, Database } from "@bondery/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactWithId } from "../data/select-fragments.js";

type ContactWithAddresses = {
  addresses: ContactAddressEntry[];
};

type AddressRow = {
  person_id: string;
  type: string;
  label: string | null;
  value: string;
  latitude: number | null;
  longitude: number | null;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_postal_code: string | null;
  address_state: string | null;
  address_state_code: string | null;
  address_country: string | null;
  address_country_code: string | null;
  address_granularity: string;
  address_formatted: string | null;
  address_geocode_source: string | null;
  geocode_confidence: string | null;
  timezone: string | null;
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
  return latitude >= 48.4 && latitude <= 51.2 && longitude >= 12.0 && longitude <= 19.0;
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

  const normalizedCountryCode = String(countryCode || "").toUpperCase();
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

/**
 * Parses and validates contact address entries from API input payload.
 *
 * @param input Raw `addresses` value from an update request body.
 * @returns Normalized address entries preserving input order.
 * @throws Error when the payload shape is invalid.
 */
export function parseAddressEntries(input: unknown): ContactAddressEntry[] {
  if (!Array.isArray(input)) {
    throw new Error("addresses must be an array");
  }

  if (input.length > 5) {
    throw new Error("addresses can contain at most 5 entries");
  }

  const parsed = input.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`addresses[${index}] must be an object`);
    }

    const maybeValue = (item as Record<string, unknown>).value;
    if (typeof maybeValue !== "string" || maybeValue.trim().length === 0) {
      throw new Error(`addresses[${index}].value is required`);
    }

    const maybeLatitude = (item as Record<string, unknown>).latitude;
    const maybeLongitude = (item as Record<string, unknown>).longitude;

    const latitude = parseCoordinateValue(maybeLatitude);
    const longitude = parseCoordinateValue(maybeLongitude);

    const normalizeNullableText = (value: unknown): string | null => {
      if (typeof value !== "string") {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const countryCode = normalizeNullableText((item as Record<string, unknown>).addressCountryCode);
    const normalizedCoordinates = normalizeCoordinatePair(latitude, longitude, countryCode);

    return {
      addressCity: normalizeNullableText((item as Record<string, unknown>).addressCity),
      addressCountry: normalizeNullableText((item as Record<string, unknown>).addressCountry),
      addressCountryCode: countryCode,
      addressFormatted: normalizeNullableText((item as Record<string, unknown>).addressFormatted),
      addressGeocodeSource: normalizeNullableText(
        (item as Record<string, unknown>).addressGeocodeSource,
      ) as ContactAddressEntry["addressGeocodeSource"],
      addressGranularity: normalizeAddressGranularity(
        (item as Record<string, unknown>).addressGranularity,
      ),
      addressLine1: normalizeNullableText((item as Record<string, unknown>).addressLine1),
      addressLine2: normalizeNullableText((item as Record<string, unknown>).addressLine2),
      addressPostalCode: normalizeNullableText((item as Record<string, unknown>).addressPostalCode),
      addressState: normalizeNullableText((item as Record<string, unknown>).addressState),
      addressStateCode: normalizeNullableText((item as Record<string, unknown>).addressStateCode),
      geocodeConfidence: null,
      label: normalizeNullableText((item as Record<string, unknown>).label),
      latitude: normalizedCoordinates.latitude,
      longitude: normalizedCoordinates.longitude,
      timezone: normalizeNullableText((item as Record<string, unknown>).timezone),
      type: normalizeAddressType((item as Record<string, unknown>).type),
      value: maybeValue.trim(),
    } as ContactAddressEntry;
  });

  return parsed;
}

/**
 * Loads normalized address rows for people and merges them into contact-shaped objects.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param contacts Contacts loaded from `people` table.
 * @returns Contacts with `addresses` arrays attached.
 */
export async function attachContactAddresses<T extends ContactWithId>(
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
): Promise<Array<T & ContactWithAddresses>> {
  if (!contacts.length) {
    return [];
  }

  const personIds = contacts.map((contact) => contact.id);

  const { data: addressRows, error: addressError } = await client
    .from("people_addresses")
    .select(
      "person_id, type, label, value, latitude, longitude, address_line1, address_line2, address_city, address_postal_code, address_state, address_state_code, address_country, address_country_code, address_granularity, address_formatted, address_geocode_source, geocode_confidence, timezone",
    )
    .eq("user_id", userId)
    .in("person_id", personIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (addressError) {
    throw new Error(addressError.message);
  }

  const byPerson = new Map<string, ContactAddressEntry[]>();
  for (const contact of contacts) {
    byPerson.set(contact.id, []);
  }

  for (const row of (addressRows || []) as AddressRow[]) {
    const bucket = byPerson.get(row.person_id);
    if (!bucket) {
      continue;
    }

    const normalizedCoordinates = normalizeCoordinatePair(
      row.latitude,
      row.longitude,
      row.address_country_code,
    );

    bucket.push({
      addressCity: row.address_city,
      addressCountry: row.address_country,
      addressCountryCode: row.address_country_code,
      addressFormatted: row.address_formatted,
      addressGeocodeSource: (row.address_geocode_source ??
        null) as ContactAddressEntry["addressGeocodeSource"],
      addressGranularity: normalizeAddressGranularity(row.address_granularity),
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      addressPostalCode: row.address_postal_code,
      addressState: row.address_state,
      addressStateCode: row.address_state_code,
      geocodeConfidence: (row.geocode_confidence ??
        null) as ContactAddressEntry["geocodeConfidence"],
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
    addresses: byPerson.get(contact.id) || [],
  }));
}

/**
 * Replaces all address rows for a person with the provided ordered entries.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param personId Person id owning the address entries.
 * @param addresses Ordered address entries.
 */
export async function replaceContactAddresses(
  client: SupabaseClient<Database>,
  userId: string,
  personId: string,
  addresses: ContactAddressEntry[],
): Promise<void> {
  const { error: deleteError } = await client
    .from("people_addresses")
    .delete()
    .eq("user_id", userId)
    .eq("person_id", personId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (addresses.length === 0) {
    return;
  }

  const insertRows = addresses.map((address, index) => ({
    address_city: address.addressCity,
    address_country: address.addressCountry,
    address_country_code: address.addressCountryCode,
    address_formatted: address.addressFormatted,
    address_geocode_source: address.addressGeocodeSource,
    address_granularity: address.addressGranularity,
    address_line1: address.addressLine1,
    address_line2: address.addressLine2,
    address_postal_code: address.addressPostalCode,
    address_state: address.addressState,
    address_state_code: address.addressStateCode,
    geocode_confidence: address.geocodeConfidence,
    label: address.label,
    latitude: address.latitude,
    longitude: address.longitude,
    person_id: personId,
    sort_order: index,
    timezone: address.timezone,
    type: address.type,
    user_id: userId,
    value: address.value,
  }));

  const { error: insertError } = await client.from("people_addresses").insert(insertRows);
  if (insertError) {
    throw new Error(insertError.message);
  }
}
