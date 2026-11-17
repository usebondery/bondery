import { getTimeZones } from "@vvo/tzdb";

const regionNamesByLocale = new Map<string, Intl.DisplayNames>();
const timeZoneNamesByLocale = new Map<string, Intl.DisplayNames>();

const CONTINENT_REGION_CODES: Readonly<Record<string, string>> = {
  Africa: "002",
  Americas: "019",
  Asia: "142",
  Europe: "150",
  Oceania: "009",
};

function regionDisplayNames(locale: string): Intl.DisplayNames | undefined {
  const cached = regionNamesByLocale.get(locale);
  if (cached) {
    return cached;
  }

  try {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    regionNamesByLocale.set(locale, names);
    return names;
  } catch {
    return undefined;
  }
}

function normalizeRegionCode(regionCode: string): string | undefined {
  const code = regionCode.trim();
  if (/^[A-Za-z]{2}$/.test(code)) {
    return code.toUpperCase();
  }
  if (/^\d{3}$/.test(code)) {
    return code;
  }
  return undefined;
}

/** Localized country or UN M.49 region name. Falls back to undefined when Intl has no name. */
export function displayRegionName(regionCode: string, locale: string): string | undefined {
  const code = normalizeRegionCode(regionCode);
  if (!code) {
    return undefined;
  }

  const names = regionDisplayNames(locale);
  if (!names) {
    return undefined;
  }

  try {
    const name = names.of(code);
    if (!name || name === code) {
      return undefined;
    }
    return name;
  } catch {
    return undefined;
  }
}

/** Localized continent group label. UTC and unknown groups stay as stored. */
export function displayContinentName(continent: string, locale: string): string {
  const regionCode = CONTINENT_REGION_CODES[continent];
  if (!regionCode) {
    return continent;
  }

  return displayRegionName(regionCode, locale) ?? continent;
}

function timeZoneDisplayNames(locale: string): Intl.DisplayNames | undefined {
  const cached = timeZoneNamesByLocale.get(locale);
  if (cached) {
    return cached;
  }

  try {
    const names = new Intl.DisplayNames([locale], {
      type: "timeZone" as Intl.DisplayNamesOptions["type"],
    });
    timeZoneNamesByLocale.set(locale, names);
    return names;
  } catch {
    return undefined;
  }
}

function englishTimeZoneCity(iana: string): string | undefined {
  if (!iana) {
    return undefined;
  }
  if (iana === "UTC") {
    return "UTC";
  }

  const match = getTimeZones().find(
    (timezone) => timezone.name === iana || timezone.group.includes(iana),
  );
  return match?.mainCities[0] ?? match?.name;
}

/**
 * Localized city for an IANA timezone.
 * Uses `Intl.DisplayNames({ type: "timeZone" })` when the runtime supports it.
 * Falls back to tzdb English `mainCities[0]`.
 */
export function displayTimeZoneCity(iana: string, locale: string): string | undefined {
  if (!iana) {
    return undefined;
  }

  const names = timeZoneDisplayNames(locale);
  if (names) {
    try {
      const name = names.of(iana);
      if (name && name !== iana) {
        return name;
      }
    } catch {
      // Runtime rejected the id. Use the English tzdb city.
    }
  }

  return englishTimeZoneCity(iana);
}
