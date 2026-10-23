import { resolveToCanonicalTimezone, TIMEZONES_DATA } from "#locale/timezones.js";

/**
 * Maps an IANA timezone to ISO-3166 alpha-2 using tzdb metadata.
 * Returns `null` for `UTC` and unknown zones.
 */
export function getCountryCodeForTimezone(iana: string): string | null {
  if (!iana || iana === "UTC") {
    return null;
  }

  const canonical = resolveToCanonicalTimezone(iana);
  const match = TIMEZONES_DATA.find((timezone) => timezone.value === canonical);
  const code = match?.countryCode?.trim().toUpperCase();
  return code && code.length === 2 ? code : null;
}
