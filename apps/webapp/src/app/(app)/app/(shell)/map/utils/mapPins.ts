import type { ContactNameFields } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { AddressPin, MapPin } from "@bondery/schemas";
import type { ContactTableRow, SortOrder } from "@/components/contacts/ContactsTableV2";

export function sortPins<T extends ContactNameFields & { lastInteraction?: string | null }>(
  list: T[],
  order: SortOrder,
): T[] {
  return [...list].sort((a, b) => {
    switch (order) {
      case "nameAsc":
        return (a.firstName ?? "").localeCompare(b.firstName ?? "");
      case "nameDesc":
        return (b.firstName ?? "").localeCompare(a.firstName ?? "");
      case "surnameAsc":
        return (a.lastName ?? "").localeCompare(b.lastName ?? "");
      case "surnameDesc":
        return (b.lastName ?? "").localeCompare(a.lastName ?? "");
      case "interactionDesc":
        return (b.lastInteraction ?? "").localeCompare(a.lastInteraction ?? "");
      case "interactionAsc":
        return (a.lastInteraction ?? "").localeCompare(b.lastInteraction ?? "");
      default:
        return 0;
    }
  });
}

/** Joins first and last name for pins, skipping empty parts. */
export function pinDisplayName(pin: { firstName?: string | null; lastName?: string | null }) {
  return [pin.firstName, pin.lastName].filter(Boolean).join(" ");
}

export function buildAddressMarkers(addressPins: AddressPin[]) {
  return addressPins.map((p) => ({
    avatarUrl: p.avatar,
    firstName: p.firstName,
    href: `${WEBAPP_ROUTES.PERSON}/${p.personId}`,
    id: p.addressId,
    lastName: p.lastName,
    latitude: p.latitude,
    location:
      p.addressFormatted ?? ([p.addressCity, p.addressCountry].filter(Boolean).join(", ") || null),
    longitude: p.longitude,
    name: pinDisplayName(p),
    personId: p.personId,
  }));
}

export function buildLocationMarkers(locationPins: MapPin[]) {
  return locationPins.map((p) => ({
    avatarUrl: p.avatar,
    firstName: p.firstName,
    headline: p.headline,
    href: `${WEBAPP_ROUTES.PERSON}/${p.id}`,
    id: p.id,
    lastName: p.lastName,
    latitude: p.latitude,
    location: p.location,
    longitude: p.longitude,
    name: pinDisplayName(p),
  }));
}

export function buildAddressContactRows(addressPins: AddressPin[]): ContactTableRow[] {
  return addressPins.map(
    (pin): ContactTableRow => ({
      _addressType: pin.addressType,
      _rowKey: pin.addressId,
      avatar: pin.avatar,
      createdAt: "",
      emails: [],
      facebook: null,
      firstName: pin.firstName,
      gisPoint: null,
      headline: null,
      id: pin.personId,
      importantDates: null,
      instagram: null,
      keepFrequencyDays: null,
      language: null,
      lastInteraction: null,
      lastInteractionActivityId: null,
      lastName: pin.lastName,
      latitude: null,
      linkedin: null,
      location:
        pin.addressFormatted ?? [pin.addressCity, pin.addressCountry].filter(Boolean).join(", "),
      longitude: null,
      middleName: null,
      myself: false,
      notes: null,
      phones: [],
      signal: null,
      timezone: null,
      updatedAt: "",
      userId: "",
      website: null,
      whatsapp: null,
    }),
  );
}
