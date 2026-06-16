import { parseVCards, vCardToContactDraft } from "@bondery/vcard";
import type { VCardPreparedContact } from "@bondery/types";
import type { UploadFile } from "../../../lib/schemas.js";
import {
  validateStreetAddress,
  cachedGeocodeLinkedInLocation,
  getTimezoneForCoordinates,
} from "../../../lib/mapy.js";
import { formatAddressLabel } from "@bondery/helpers";

type PreparedAddress = VCardPreparedContact["addresses"][0];

const GEOCODE_BATCH_SIZE = 5;

/**
 * Parses uploaded .vcf files, validates addresses via geocoding, and returns
 * normalized contacts ready for preview and import.
 *
 * Each file may contain one or more vCard entries. Invalid entries (missing first+last name)
 * are flagged but still included so the user can see them in the preview.
 *
 * Address validation runs during parse so the commit step becomes a pure DB insert:
 *  - Addresses where the street geocodes successfully are marked "valid" (city-level
 *    coordinates + confirmed street).
 *  - Addresses without a street, or whose street cannot be confirmed by the geocoder,
 *    are marked "unverifiable" and imported with city-level coordinates (or none).
 *  - No addresses are silently dropped — geocoder coverage gaps should not prevent import.
 *
 * @param files Uploaded .vcf file buffers.
 * @returns Array of prepared contacts for the import preview.
 */
export async function parseVCardUpload(files: UploadFile[]): Promise<VCardPreparedContact[]> {
  if (files.length === 0) {
    throw new Error("No files uploaded");
  }

  const contacts: VCardPreparedContact[] = [];

  for (const file of files) {
    const content = file.content.toString("utf8");
    let parsed: ReturnType<typeof parseVCards>;

    try {
      parsed = parseVCards(content);
    } catch {
      throw new Error(`Failed to parse ${file.fileName}: invalid vCard format`);
    }

    for (const entry of parsed) {
      const draft = vCardToContactDraft(entry.card);
      const issues: string[] = [];

      const firstName = normalizeString(draft.firstName) ?? "";
      const middleName = normalizeString(draft.middleName);
      const lastName = normalizeString(draft.lastName);

      const hasName = firstName.length > 0 || (lastName?.length ?? 0) > 0;
      if (!hasName) {
        issues.push("Missing first and last name");
      }

      contacts.push({
        tempId: crypto.randomUUID(),
        firstName,
        middleName,
        lastName: lastName ?? "",
        headline: normalizeString(draft.headline),
        phones: draft.phones,
        emails: draft.emails,
        addresses: draft.addresses.map((addr) => ({
          ...addr,
          addressStateCode: null,
          addressCountryCode: null,
          addressFormatted: null,
          geocodeSource: null,
          validity: "unverifiable" as const,
          timezone: null,
        })),
        linkedin: normalizeString(draft.linkedin),
        instagram: normalizeString(draft.instagram),
        whatsapp: normalizeString(draft.whatsapp),
        facebook: normalizeString(draft.facebook),
        signal: normalizeString(draft.signal),
        website: normalizeString(draft.website),
        avatarUri: normalizeString(draft.avatarUri),
        importantDates: draft.importantDates,
        isValid: hasName,
        issues,
      });
    }
  }

  // ── Geocode & validate all addresses ────────────────────────────────────────
  type AddressJob = { contactIndex: number; addressIndex: number };
  const jobs: AddressJob[] = contacts.flatMap((c, ci) =>
    c.addresses.map((_, ai) => ({ contactIndex: ci, addressIndex: ai })),
  );

  for (let i = 0; i < jobs.length; i += GEOCODE_BATCH_SIZE) {
    const batch = jobs.slice(i, i + GEOCODE_BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async ({ contactIndex, addressIndex }) => {
        const addr = contacts[contactIndex].addresses[addressIndex];
        contacts[contactIndex].addresses[addressIndex] = await enrichAddress(addr);
      }),
    );
  }

  return contacts;
}

/**
 * Geocodes and validates a single address entry.
 *
 * - If the address has both a street and a city, street validation via the geocoder
 *   is REQUIRED. A successful match marks the address `"valid"` and uses the
 *   geocoder's standardised data (street name, postal code, region, etc.) rather
 *   than the vCard's raw values — which may have bad postal codes or non-standard
 *   street numbers.
 * - If street validation fails (geocoder cannot find the address) the address is
 *   marked `"invalid"` and filtered out during the commit step. This avoids saving
 *   addresses whose location cannot be confirmed.
 * - If the address has no street but has a city/region, a city-level geocode fills
 *   coordinates and the address is stored as `"unverifiable"` with lower granularity.
 * - If geocoding fails entirely, the address is returned as-is with `"unverifiable"`.
 */
async function enrichAddress(addr: PreparedAddress): Promise<PreparedAddress> {
  const {
    addressLine1: street,
    addressCity: city,
    addressState: state,
    addressCountry: country,
  } = addr;

  // ── Phase 1: Street validation (required when street is present) ─────────────
  if (street && city) {
    const streetQuery = [street, city, state, country].filter(Boolean).join(", ");
    const streetResult = await validateStreetAddress(streetQuery, city);

    if (streetResult) {
      // Geocoder found the address — use its normalised fields instead of the
      // vCard's values (which may have bad postal codes or non-standard numbering).
      const timezone = await getTimezoneForCoordinates(streetResult.lat, streetResult.lon);

      const addressFormatted = formatAddressLabel({
        addressLine1: streetResult.name,
        addressLine2: addr.addressLine2 ?? undefined,
        city: streetResult.city ?? undefined,
        postalCode: streetResult.postalCode ?? undefined,
        state: streetResult.state ?? undefined,
        countryCode: streetResult.countryCode ?? undefined,
      });

      return {
        ...addr,
        addressLine1: streetResult.name || street,
        addressPostalCode: streetResult.postalCode ?? addr.addressPostalCode,
        addressCity: streetResult.city ?? city,
        addressState: streetResult.state ?? state,
        addressStateCode: streetResult.stateCode,
        addressCountry: streetResult.country ?? country,
        addressCountryCode: streetResult.countryCode,
        addressFormatted,
        latitude: streetResult.lat,
        longitude: streetResult.lon,
        geocodeSource: "mapy.com",
        validity: "valid",
        timezone,
      };
    }

    // Street geocoding failed — the address cannot be confirmed; discard it.
    return { ...addr, validity: "invalid" };
  }

  // ── Phase 2: City-level geocode for addresses without a street ───────────────
  // Only fills coordinates and codes; address is stored as unverifiable.
  if (city || state || country) {
    const candidates = [
      [city, country].filter(Boolean).join(", "),
      [state, country].filter(Boolean).join(", "),
    ].filter((s): s is string => !!s && s.length > 0);

    const seen = new Set<string>();
    for (const candidate of candidates) {
      const key = candidate.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const result = await cachedGeocodeLinkedInLocation(candidate);
      if (!result) continue;

      return {
        ...addr,
        latitude: addr.latitude ?? result.geo.lat,
        longitude: addr.longitude ?? result.geo.lon,
        addressCity: city ?? result.geo.city,
        addressState: state ?? result.geo.state,
        addressStateCode: result.geo.stateCode,
        addressCountry: country ?? result.geo.country,
        addressCountryCode: result.geo.countryCode,
        addressFormatted: result.geo.formattedLabel,
        geocodeSource: "mapy.com",
        validity: "unverifiable",
        timezone: result.timezone,
      };
    }
  }

  // Geocode produced no result — return as-is.
  return { ...addr, validity: "unverifiable" };
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
