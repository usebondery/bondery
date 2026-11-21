import { getTimeZones } from "@vvo/tzdb";
import {
  displayContinentName,
  displayRegionName,
  displayTimeZoneCity,
} from "#locale/display-names.js";

export interface TimezoneData {
  city: string;
  continent: string;
  country: string;
  countryCode: string;
  flag: string;
  group: string[];
  offset: number;
  value: string;
}

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

export const TIMEZONES_DATA: TimezoneData[] = [
  {
    city: "UTC",
    continent: "UTC",
    country: "Coordinated Universal Time",
    countryCode: "",
    flag: "",
    group: ["UTC"],
    offset: 0,
    value: "UTC",
  },
  ...getTimeZones().map((tz) => ({
    city: tz.mainCities[0] ?? tz.name,
    continent: normalizeContinent(tz.continentName),
    country: tz.countryName,
    countryCode: tz.countryCode,
    flag: tz.countryCode.toLowerCase(),
    group: tz.group,
    offset: tz.rawOffsetInMinutes,
    value: tz.name,
  })),
];

export function resolveToCanonicalTimezone(iana: string): string {
  if (!iana) {
    return iana;
  }
  const match = TIMEZONES_DATA.find((tz) => tz.group.includes(iana));
  return match ? match.value : iana;
}

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatTimezoneLabel(timezone: TimezoneData, locale?: string): string {
  const city = locale
    ? (displayTimeZoneCity(timezone.value, locale) ?? timezone.city)
    : timezone.city;
  const country =
    locale && timezone.countryCode
      ? (displayRegionName(timezone.countryCode, locale) ?? timezone.country)
      : timezone.country;
  return `${city}, ${country}`;
}

export interface TimezoneSelectOption {
  city: string;
  flag: string;
  label: string;
  offset: number;
  offsetLabel: string;
  value: string;
}

export function countryCodeToFlagEmoji(countryCode: string | null | undefined): string {
  if (countryCode?.length !== 2) {
    return "🌐";
  }

  const upper = countryCode.toUpperCase();
  return String.fromCodePoint(...upper.split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

function compareTimezoneSelectOptions(
  a: TimezoneSelectOption,
  b: TimezoneSelectOption,
  locale?: string,
): number {
  if (a.offset !== b.offset) {
    return a.offset - b.offset;
  }

  return a.label.localeCompare(b.label, locale);
}

function buildTimezoneSelectOptions(locale?: string): TimezoneSelectOption[] {
  return TIMEZONES_DATA.map((timezone) => ({
    city: timezone.city,
    flag: timezone.flag,
    label: formatTimezoneLabel(timezone, locale),
    offset: timezone.offset,
    offsetLabel: formatOffset(timezone.offset),
    value: timezone.value,
  })).sort((left, right) => compareTimezoneSelectOptions(left, right, locale));
}

const cachedTimezoneSelectOptions = new Map<string, TimezoneSelectOption[]>();

/**
 * Flat select options for timezone pickers (mobile + web).
 * Sorted by UTC offset, then city label.
 */
export function getTimezoneSelectOptions(
  currentTimezone?: string,
  locale?: string,
): TimezoneSelectOption[] {
  const cacheKey = locale ?? "";
  let options = cachedTimezoneSelectOptions.get(cacheKey);
  if (!options) {
    options = buildTimezoneSelectOptions(locale);
    cachedTimezoneSelectOptions.set(cacheKey, options);
  }

  if (!currentTimezone) {
    return options;
  }

  const canonicalCurrent = resolveToCanonicalTimezone(currentTimezone);
  if (options.some((option) => option.value === canonicalCurrent)) {
    return options;
  }

  return [
    {
      city: canonicalCurrent,
      flag: "",
      label: canonicalCurrent,
      offset: 0,
      offsetLabel: formatOffset(0),
      value: canonicalCurrent,
    },
    ...options,
  ];
}

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

export function getCurrentTimeInTimezone(offsetMinutes: number): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const targetTime = new Date(utc + offsetMinutes * 60000);
  return targetTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
}

export interface GroupedTimezoneItem {
  flag: string;
  label: string;
  offset: number;
  searchHaystack: string;
  value: string;
}

export interface GroupedTimezoneGroup {
  group: string;
  items: GroupedTimezoneItem[];
}

const cachedGroupedTimezones = new Map<string, GroupedTimezoneGroup[]>();

/**
 * Timezones grouped by continent, labels localized for `locale`. Built once per locale and
 * shared: callers must not mutate the result.
 */
export function getGroupedTimezones(locale?: string): GroupedTimezoneGroup[] {
  const cacheKey = locale ?? "";
  const cached = cachedGroupedTimezones.get(cacheKey);
  if (cached) {
    return cached;
  }
  const result = buildGroupedTimezones(locale);
  cachedGroupedTimezones.set(cacheKey, result);
  return result;
}

function buildGroupedTimezones(locale?: string): GroupedTimezoneGroup[] {
  const grouped: { [continent: string]: GroupedTimezoneItem[] } = {};

  for (const tz of TIMEZONES_DATA) {
    let continentItems = grouped[tz.continent];
    if (!continentItems) {
      continentItems = [];
      grouped[tz.continent] = continentItems;
    }
    const label = formatTimezoneLabel(tz, locale);
    continentItems.push({
      flag: tz.flag,
      label,
      offset: tz.offset,
      searchHaystack: [label, tz.city, tz.country, tz.countryCode, tz.value]
        .join(" ")
        .toLowerCase(),
      value: tz.value,
    });
  }

  for (const items of Object.values(grouped)) {
    items.sort((a, b) => {
      if (a.offset !== b.offset) {
        return a.offset - b.offset;
      }

      return a.label.localeCompare(b.label, locale);
    });
  }

  const continentOrder = ["UTC", "Africa", "Americas", "Asia", "Europe", "Oceania"];
  return continentOrder.flatMap((continent) => {
    const items = grouped[continent];
    if (!items) {
      return [];
    }
    return [{ group: locale ? displayContinentName(continent, locale) : continent, items }];
  });
}
