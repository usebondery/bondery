import type { ContactAddressEntry, Database, EmailEntry, PhoneEntry } from "@bondery/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ContactExtrasPayload = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  addresses: ContactAddressEntry[];
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
};

const EMPTY_EXTRAS: ContactExtrasPayload = {
  addresses: [],
  emails: [],
  facebook: null,
  instagram: null,
  linkedin: null,
  phones: [],
  signal: null,
  website: null,
  whatsapp: null,
};

function normalizeContactType(value: unknown): "home" | "work" {
  return value === "work" ? "work" : "home";
}

function normalizeAddressType(value: unknown): ContactAddressEntry["type"] {
  if (value === "work") {
    return "work";
  }
  if (value === "other") {
    return "other";
  }
  return "home";
}

function normalizeAddressGranularity(value: unknown): ContactAddressEntry["addressGranularity"] {
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

function parsePhoneEntry(value: unknown): PhoneEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.prefix !== "string" || typeof row.value !== "string") {
    return null;
  }
  return {
    preferred: row.preferred === true,
    prefix: row.prefix,
    type: normalizeContactType(row.type),
    value: row.value,
  };
}

function parseEmailEntry(value: unknown): EmailEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.value !== "string") {
    return null;
  }
  return {
    preferred: row.preferred === true,
    type: normalizeContactType(row.type),
    value: row.value,
  };
}

function parseAddressEntry(value: unknown): ContactAddressEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.value !== "string") {
    return null;
  }

  const latitude = typeof row.latitude === "number" ? row.latitude : null;
  const longitude = typeof row.longitude === "number" ? row.longitude : null;

  return {
    addressCity: typeof row.addressCity === "string" ? row.addressCity : null,
    addressCountry: typeof row.addressCountry === "string" ? row.addressCountry : null,
    addressCountryCode: typeof row.addressCountryCode === "string" ? row.addressCountryCode : null,
    addressFormatted: typeof row.addressFormatted === "string" ? row.addressFormatted : null,
    addressGeocodeSource:
      row.addressGeocodeSource === "mapy.com" || row.addressGeocodeSource === "manual"
        ? row.addressGeocodeSource
        : null,
    addressGranularity: normalizeAddressGranularity(row.addressGranularity),
    addressLine1: typeof row.addressLine1 === "string" ? row.addressLine1 : null,
    addressLine2: typeof row.addressLine2 === "string" ? row.addressLine2 : null,
    addressPostalCode: typeof row.addressPostalCode === "string" ? row.addressPostalCode : null,
    addressState: typeof row.addressState === "string" ? row.addressState : null,
    addressStateCode: typeof row.addressStateCode === "string" ? row.addressStateCode : null,
    geocodeConfidence:
      row.geocodeConfidence === "verified" || row.geocodeConfidence === "unverifiable"
        ? row.geocodeConfidence
        : null,
    label: typeof row.label === "string" ? row.label : null,
    latitude,
    longitude,
    timezone: typeof row.timezone === "string" ? row.timezone : null,
    type: normalizeAddressType(row.type),
    value: row.value,
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Parses RPC JSON shape v1 into a per-person extras map. Exported for unit tests. */
export function parseContactExtrasRpcResult(raw: unknown): Map<string, ContactExtrasPayload> {
  const map = new Map<string, ContactExtrasPayload>();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return map;
  }

  for (const [personId, payload] of Object.entries(raw as Record<string, unknown>)) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      map.set(personId, { ...EMPTY_EXTRAS });
      continue;
    }

    const row = payload as Record<string, unknown>;
    const phones = Array.isArray(row.phones)
      ? row.phones.map(parsePhoneEntry).filter((entry): entry is PhoneEntry => entry !== null)
      : [];
    const emails = Array.isArray(row.emails)
      ? row.emails.map(parseEmailEntry).filter((entry): entry is EmailEntry => entry !== null)
      : [];
    const addresses = Array.isArray(row.addresses)
      ? row.addresses
          .map(parseAddressEntry)
          .filter((entry): entry is ContactAddressEntry => entry !== null)
      : [];

    map.set(personId, {
      addresses,
      emails,
      facebook: nullableString(row.facebook),
      instagram: nullableString(row.instagram),
      linkedin: nullableString(row.linkedin),
      phones,
      signal: nullableString(row.signal),
      website: nullableString(row.website),
      whatsapp: nullableString(row.whatsapp),
    });
  }

  return map;
}

export function getEmptyContactExtras(): ContactExtrasPayload {
  return { ...EMPTY_EXTRAS };
}

/**
 * Loads phones, emails, addresses, and socials for many contacts in one RPC call.
 */
export async function fetchContactExtras(
  client: SupabaseClient<Database>,
  userId: string,
  personIds: string[],
): Promise<Map<string, ContactExtrasPayload>> {
  if (personIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client.rpc("get_contact_extras", {
    p_person_ids: personIds,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return parseContactExtrasRpcResult(data);
}
