import { formatAddressLabel } from "@bondery/helpers/address";
import type { Contact, ContactAddressEntry, ContactAddressType } from "@bondery/schemas";

export interface EditableAddress extends ContactAddressEntry {
  id: string;
}

export interface DraftAddress {
  suggestion: ContactAddressEntry | null;
  type: ContactAddressType;
  value: string;
}

export interface ContactAddressSavePayload {
  addresses: ContactAddressEntry[];
  forceLocation?: boolean;
  locationOnly?: boolean;
  suggestedLocation: {
    location: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  timezone?: string;
  timezoneOnly?: boolean;
}

export function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function applyGeocodedSuggestion(
  suggestion: ContactAddressEntry,
  type: ContactAddressType,
): Omit<EditableAddress, "id"> {
  return { ...suggestion, type };
}

function normalizeAddressTypes(entries: ContactAddressEntry[]): ContactAddressEntry[] {
  return entries;
}

export function toEditableAddresses(contact: Contact): EditableAddress[] {
  const existing = Array.isArray(contact.addresses)
    ? (contact.addresses as ContactAddressEntry[])
    : [];

  if (existing.length > 0) {
    return normalizeAddressTypes(existing).map((address, index) => {
      const computedValue = formatAddressLabel({
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.addressCity,
        countryCode: address.addressCountryCode,
        postalCode: address.addressPostalCode,
        state: address.addressState,
      });
      return {
        ...address,
        id: `${address.type}-${index}`,
        type: address.type,
        value:
          computedValue ||
          address.value ||
          address.addressFormatted ||
          address.addressLine1 ||
          contact.location ||
          "",
      };
    });
  }

  return [];
}

export function toSuggestionKey(value: string): string {
  return value.trim().toLowerCase();
}

export function hasValidCoordinates(latitude: number | null, longitude: number | null): boolean {
  if (latitude === null || longitude === null) {
    return false;
  }

  return Number.isFinite(latitude) && Number.isFinite(longitude);
}
