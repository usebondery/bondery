import type { ContactAddressEntry, ContactAddressType } from "@bondery/schemas";
import { formatAddressLabel } from "#address/address-utils.js";
import type { MapSuggestionItem, MapSuggestionRegionalEntry } from "#address/mapy-suggest.js";

export interface SuggestionToContactAddressOptions {
  label?: string | null;
  timezone?: string | null;
  type?: ContactAddressType;
}

/** Treats an empty string like a missing value, so a blank API field never wins a fallback chain. */
function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
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
  return entries.filter((entry) => entry.type === wantedType).at(-1) ?? null;
}

function deriveGranularity(type: string): ContactAddressEntry["addressGranularity"] {
  if (type === "regional.country") {
    return "country";
  }
  if (type === "regional.region") {
    return "state";
  }
  if (type === "regional.municipality" || type === "regional.municipality_part") {
    return "city";
  }
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

const CZECHIA_MIN_LATITUDE = 48.4;
const CZECHIA_MAX_LATITUDE = 51.2;
const CZECHIA_MIN_LONGITUDE = 12;
const CZECHIA_MAX_LONGITUDE = 19;

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

  const normalizedCountryCode = (nonEmpty(countryCode) ?? "").toUpperCase();
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
  if (typeof label !== "string") {
    return null;
  }
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
  const addressCity = nonEmpty(municipality?.name) ?? nonEmpty(municipalityPart?.name);
  const addressPostalCode = nonEmpty(item.zip);
  const addressState = nonEmpty(region?.name);
  const addressCountryCode = nonEmpty(countryEntry?.isoCode);
  const addressCountry = nonEmpty(countryEntry?.name);
  const formattedValue = formatAddressLabel({
    addressLine1,
    city: addressCity,
    countryCode: addressCountryCode,
    postalCode: addressPostalCode,
    state: addressState,
  });

  return {
    addressCity,
    addressCountry,
    addressCountryCode,
    addressFormatted: formattedValue || item.label,
    addressGeocodeSource: "mapy.com",
    addressGranularity: deriveGranularity(item.type),
    addressLine1,
    addressLine2: null,
    addressPostalCode,
    addressState,
    addressStateCode: null,
    geocodeConfidence: null,
    label: normalizeLabel(options?.label),
    latitude: normalizedCoordinates.latitude,
    longitude: normalizedCoordinates.longitude,
    timezone: normalizeLabel(options?.timezone),
    type: options?.type ?? "home",
    value: formattedValue || item.label,
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
    addressCity: null,
    addressCountry: null,
    addressCountryCode: null,
    addressFormatted: null,
    addressGeocodeSource: "manual",
    addressGranularity: "address",
    addressLine1: null,
    addressLine2: null,
    addressPostalCode: null,
    addressState: null,
    addressStateCode: null,
    geocodeConfidence: null,
    label: normalizeLabel(input.label),
    latitude: null,
    longitude: null,
    timezone: normalizeLabel(input.timezone),
    type: input.type,
    value: trimmedValue,
  };
}
