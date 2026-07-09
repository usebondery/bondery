"use client";

import type { AddressPin, MapPin } from "@bondery/schemas";
import type { MapPinsBounds } from "@/lib/api/resources/contacts";
import type { MapView } from "@/lib/contacts/map-types";
import { useMapPinsQuery } from "@/lib/query/hooks/useContacts";

export function useMapViewportPins(view: MapView, bounds: MapPinsBounds | null) {
  const contactEnabled = view === "locations";
  const addressEnabled = view === "addresses";

  const contactQuery = useMapPinsQuery("contact", bounds, contactEnabled);
  const addressQuery = useMapPinsQuery("address", bounds, addressEnabled);

  const activeQuery = contactEnabled ? contactQuery : addressQuery;

  return {
    addressPins: addressQuery.data?.pins ?? ([] as AddressPin[]),
    error: activeQuery.error,
    isError: activeQuery.isError,
    isFetching: activeQuery.isFetching,
    isLoading: activeQuery.isLoading,
    locationPins: contactQuery.data?.pins ?? ([] as MapPin[]),
  };
}
