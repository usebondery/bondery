"use client";

import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import type { ContactAddressEntry } from "@bondery/schemas";
import { useCallback, useState } from "react";
import type { PeopleMapFocus } from "@/components/map/PeopleMap";

const LOCATION_SELECT_ZOOM = 13;

/** Location search text plus the focus the map should fly to after a suggestion is picked. */
export function useMapLocationSearch() {
  const [locationQuery, setLocationQuery] = useState("");
  const [mapFocus, setMapFocus] = useState<PeopleMapFocus | null>(null);

  const handleLocationSelect = useCallback((selected: ContactAddressEntry) => {
    if (selected.latitude === null || selected.longitude === null) {
      return;
    }
    const label = geocodeSuggestionDisplayLabel(selected);
    setLocationQuery(label);
    setMapFocus({
      latitude: selected.latitude,
      longitude: selected.longitude,
      token: `${label}-${Date.now()}`,
      zoom: LOCATION_SELECT_ZOOM,
    });
  }, []);

  return {
    handleLocationSelect,
    locationQuery,
    mapFocus,
    setLocationQuery,
    setMapFocus,
  };
}
