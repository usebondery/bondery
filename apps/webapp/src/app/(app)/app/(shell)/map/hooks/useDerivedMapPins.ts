"use client";

import type { AddressPin, MapPin } from "@bondery/schemas";
import { useMemo } from "react";
import {
  buildAddressContactRows,
  buildAddressMarkers,
  buildLocationMarkers,
} from "../utils/mapPins";
import type { MapView } from "../utils/types";

interface DeriveMapPinsOptions {
  addressPins: AddressPin[];
  locationPins: MapPin[];
  view: MapView;
  visibleMarkerIds: string[];
}

/** Markers, visible pins, and address table rows derived from the viewport pins. */
export function useDerivedMapPins({
  addressPins,
  locationPins,
  view,
  visibleMarkerIds,
}: DeriveMapPinsOptions) {
  const markers = useMemo(
    () =>
      view === "addresses" ? buildAddressMarkers(addressPins) : buildLocationMarkers(locationPins),
    [addressPins, locationPins, view],
  );

  const visibleMarkerIdSet = useMemo(() => new Set(visibleMarkerIds), [visibleMarkerIds]);

  const visibleLocationPins = useMemo(
    () => locationPins.filter((pin) => visibleMarkerIdSet.has(pin.id)),
    [locationPins, visibleMarkerIdSet],
  );

  const visibleAddressPins = useMemo(
    () => addressPins.filter((pin) => visibleMarkerIdSet.has(pin.addressId)),
    [addressPins, visibleMarkerIdSet],
  );

  const addressContactRows = useMemo(
    () => buildAddressContactRows(visibleAddressPins),
    [visibleAddressPins],
  );

  return { addressContactRows, markers, visibleLocationPins };
}

export type { Contact } from "@bondery/schemas";
