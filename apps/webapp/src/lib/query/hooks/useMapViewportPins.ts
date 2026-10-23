"use client";

import type { AddressPin, MapPin } from "@bondery/schemas";
import type { MapUrlCamera } from "@/app/(app)/app/(shell)/map/utils/mapUrlCamera";
import type { MapView } from "@/lib/contacts/map-types";
import { useMapPinsQuery } from "@/lib/query/hooks/useContacts";

export function useMapViewportPins(view: MapView, camera: MapUrlCamera | null) {
  const contactEnabled = view === "locations";
  const addressEnabled = view === "addresses";

  const contactQuery = useMapPinsQuery("contact", camera, contactEnabled);
  const addressQuery = useMapPinsQuery("address", camera, addressEnabled);

  const activeQuery = contactEnabled ? contactQuery : addressQuery;

  return {
    addressPins: addressQuery.data?.pins ?? ([] as AddressPin[]),
    error: activeQuery.error,
    isError: activeQuery.isError,
    isFetching: activeQuery.isFetching,
    isLoading: activeQuery.isLoading,
    isPlaceholderData: activeQuery.isPlaceholderData,
    locationPins: contactQuery.data?.pins ?? ([] as MapPin[]),
  };
}
