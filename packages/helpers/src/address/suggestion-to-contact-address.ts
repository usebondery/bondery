import type { ContactAddressEntry, ContactAddressType } from "@bondery/schemas";
import { formatAddressLabel } from "./address-utils.js";
import type { MapSuggestionItem, MapSuggestionRegionalEntry } from "./mapy-suggest.js";

export interface SuggestionToContactAddressOptions {
  type?: ContactAddressType;
  label?: string | null;
  timezone?: string | null;
}

function pickByType(
  entries: MapSuggestionRegionalEntry[],
  wantedType: string,
): MapSuggestionRegionalEntry | null {
  const match = entries.find((entry) => entry.type === wantedType);
  return match || null;
}

function pickLastByType(
  entries: MapSuggestionRegionalEntry[],
  wantedType: string,
): MapSuggestionRegionalEntry | null {
  const matches = entries.filter((entry) => entry.type === wantedType);
  if (matches.length === 0) return null;
  return matches[matches.length - 1] || null;
}

function deriveGranularity(type: string): ContactAddressEntry["addressGranularity"] {
  if (type === "regional.country") return "country";
  if (type === "regional.region") return "state";
  if (type === "regional.municipality" || type === "regional.municipality_part") return "city";
  return "address";
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

function normalizeLabel(label: string | null | undefined): string | null {
  if (typeof label !== "string") return null;
  const trimmed = label.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function mapSuggestionToContactAddress(
  item: MapSuggestionItem,
  options?: SuggestionToContactAddressOptions,
): ContactAddressEntry {
  const municipality = pickByType(item.regionalStructure, "regional.municipality");
  const municipalityPart = pickByType(item.regionalStructure, "regional.municipality_part");
  const region = pickLastByType(item.regionalStructure, "regional.region");
  const countryEntry = pickByType(item.regionalStructure, "regional.country");
  const normalizedCoordinates = normalizeCoordinatePair(
    item.position.lat,
    item.position.lon,
    countryEntry?.isoCode,
  );

  const addressLine1 = item.type === "regional.address" ? item.name : null;
  const addressCity = municipality?.name || municipalityPart?.name || null;
  const addressPostalCode = item.zip || null;
  const addressState = region?.name || null;
  const addressCountryCode = countryEntry?.isoCode || null;
  const addressCountry = countryEntry?.name || null;
  const formattedValue = formatAddressLabel({
    addressLine1,
    city: addressCity,
    postalCode: addressPostalCode,
    state: addressState,
    countryCode: addressCountryCode,
  });

  return {
    value: formattedValue || item.label,
    type: options?.type ?? "home",
    label: normalizeLabel(options?.label),
    latitude: normalizedCoordinates.latitude,
    longitude: normalizedCoordinates.longitude,
    addressLine1,
    addressLine2: null,
    addressCity,
    addressPostalCode,
    addressState,
    addressStateCode: null,
    addressCountry,
    addressCountryCode,
    addressGranularity: deriveGranularity(item.type),
    addressFormatted: formattedValue || item.label,
    addressGeocodeSource: "mapy.com",
    geocodeConfidence: null,
    timezone: normalizeLabel(options?.timezone),
  };
}

export function buildManualContactAddress(input: {
  value: string;
  type: ContactAddressType;
  label?: string | null;
  timezone?: string | null;
}): ContactAddressEntry {
  const trimmedValue = input.value.trim();

  return {
    value: trimmedValue,
    type: input.type,
    label: normalizeLabel(input.label),
    latitude: null,
    longitude: null,
    addressLine1: null,
    addressLine2: null,
    addressCity: null,
    addressPostalCode: null,
    addressState: null,
    addressStateCode: null,
    addressCountry: null,
    addressCountryCode: null,
    addressGranularity: "address",
    addressFormatted: null,
    addressGeocodeSource: "manual",
    geocodeConfidence: null,
    timezone: normalizeLabel(input.timezone),
  };
}
