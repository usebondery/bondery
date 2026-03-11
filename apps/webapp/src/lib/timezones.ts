import { getTimeZones } from "@vvo/tzdb";

export interface TimezoneData {
  value: string; // IANA timezone identifier (canonical name)
  city: string; // Primary city name
  country: string; // Country name
  continent: string; // Continent for grouping
  flag: string; // ISO 3166-1 alpha-2 country code (lowercase)
  offset: number; // Raw UTC offset in minutes (non-DST)
  /** All IANA timezone identifiers that map to this entry, including legacy aliases */
  group: string[];
}

/**
 * Maps @vvo/tzdb continent names to the display groups used in the picker.
 * The library distinguishes North/South/Central America and the Caribbean;
 * we collapse them all into a single "Americas" group.
 */
function normalizeContinent(continentName: string): string {
  if (
    continentName === "North America" ||
    continentName === "South America" ||
    continentName === "Central America" ||
    continentName === "Caribbean"
  ) {
    return "Americas";
  }
  return continentName;
}

/**
 * Full list of IANA timezones derived from @vvo/tzdb, mapped to TimezoneData.
 * This replaces the previous hand-maintained static list and is automatically
 * kept up to date as the library releases new versions.
 *
 * Each entry's `group` field contains all IANA aliases that resolve to it,
 * enabling correct picker selection for users whose browsers report legacy
 * identifiers (e.g. "America/Indianapolis" -> its canonical grouped entry).
 */
export const TIMEZONES_DATA: TimezoneData[] = [
  // UTC added explicitly at the top for consistent ordering
  {
    value: "UTC",
    city: "UTC",
    country: "Coordinated Universal Time",
    continent: "UTC",
    flag: "",
    offset: 0,
    group: ["UTC"],
  },
  ...getTimeZones().map((tz) => ({
    value: tz.name,
    city: tz.mainCities[0] ?? tz.name,
    country: tz.countryName,
    continent: normalizeContinent(tz.continentName),
    flag: tz.countryCode.toLowerCase(),
    offset: tz.rawOffsetInMinutes,
    group: tz.group,
  })),
];

/**
 * Resolves an arbitrary IANA timezone identifier (including legacy aliases) to
 * the canonical value used by the timezone picker.
 *
 * Looks up `iana` in each entry's `group` array. If found, returns the entry's
 * canonical `value`. If not found, returns the input unchanged so the caller
 * can still persist it.
 *
 * @param iana - The IANA timezone string to resolve (e.g. "America/Detroit").
 * @returns The canonical picker value (e.g. "America/New_York"), or the input if no match.
 */
export function resolveToCanonicalTimezone(iana: string): string {
  if (!iana) return iana;
  const match = TIMEZONES_DATA.find((tz) => tz.group.some((alias) => alias === iana));
  return match ? match.value : iana;
}

// Helper function to format offset as readable string
export function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  if (mins === 0) {
    return `UTC${sign}${hours}`;
  }
  return `UTC${sign}${hours}:${mins.toString().padStart(2, "0")}`;
}

// Helper function to get current time in a timezone
export function getCurrentTimeInTimezone(offsetMinutes: number): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const targetTime = new Date(utc + offsetMinutes * 60000);
  return targetTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Group timezones by continent and sort alphabetically
export function getGroupedTimezones() {
  interface GroupedItem {
    value: string;
    label: string;
    flag: string;
    offset: number;
  }

  const grouped: { [continent: string]: GroupedItem[] } = {};

  TIMEZONES_DATA.forEach((tz) => {
    if (!grouped[tz.continent]) {
      grouped[tz.continent] = [];
    }
    grouped[tz.continent].push({
      value: tz.value,
      label: `${tz.city}, ${tz.country}`,
      flag: tz.flag,
      offset: tz.offset,
    });
  });

  // Sort each continent's timezones alphabetically by label
  Object.keys(grouped).forEach((continent) => {
    grouped[continent].sort((a, b) => a.label.localeCompare(b.label));
  });

  // Convert to Mantine Select group format
  const continentOrder = ["UTC", "Africa", "Americas", "Asia", "Europe", "Oceania"];
  return continentOrder
    .filter((continent) => grouped[continent])
    .map((continent) => ({
      group: continent,
      items: grouped[continent],
    }));
}
