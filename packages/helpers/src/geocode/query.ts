/**
 * Shared query-string builders for geocode API routes.
 */

export function buildGeocodeSuggestQuery(
  search: string,
  mode: "address" | "place" = "address",
): string {
  const params = new URLSearchParams({ mode, search: search.trim() });
  return params.toString();
}

export function buildGeocodeTimezoneQuery(lat: number, lon: number): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  return params.toString();
}

/**
 * Stable key for deduplicating geocode suggestions in autocomplete UIs.
 */
export function geocodeSuggestionDisplayKey(entry: {
  value: string;
  addressFormatted?: string | null;
  latitude: number | null;
  longitude: number | null;
}): string {
  const label = entry.addressFormatted || entry.value;
  return `${label}|${entry.latitude ?? ""}|${entry.longitude ?? ""}`;
}

export function geocodeSuggestionDisplayLabel(entry: {
  value: string;
  addressFormatted?: string | null;
}): string {
  return entry.addressFormatted || entry.value;
}
