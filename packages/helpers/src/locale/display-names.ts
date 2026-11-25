import { getTimeZones } from "@vvo/tzdb";

const ZA_RE = /^[A-Za-z]{2}$/u;
const PATTERN_5E5C647B337D_RE = /^\d{3}$/u;

const regionNamesByLocale = new Map<string, Intl.DisplayNames>();
/** `null` records a locale whose runtime rejects `type: "timeZone"`, so the throw happens once. */
const timeZoneNamesByLocale = new Map<string, Intl.DisplayNames | null>();

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
  if (ZA_RE.test(code)) {
    return code.toUpperCase();
  }
  if (PATTERN_5E5C647B337D_RE.test(code)) {
    return code;
  }
  return undefined;
}

/**
 * `type: "timeZone"` is not part of ECMA-402, and current engines (V8, so Node and Chrome)
 * reject it. The failure is cached so it costs one throw per locale, not one per timezone.
 */
function timeZoneDisplayNames(locale: string): Intl.DisplayNames | undefined {
  if (timeZoneNamesByLocale.has(locale)) {
    return timeZoneNamesByLocale.get(locale) ?? undefined;
  }

  let names: Intl.DisplayNames | null;
  try {
    names = new Intl.DisplayNames([locale], {
      type: "timeZone" as Intl.DisplayNamesOptions["type"],
    });
  } catch {
    names = null;
  }
  timeZoneNamesByLocale.set(locale, names);
  return names ?? undefined;
}

let englishCityByZone: Map<string, string> | null = null;

/**
 * English city for every IANA name and alias, built once. `getTimeZones()` rebuilds the whole
 * tzdb list on each call (about 30 ms), so calling it per timezone made one picker render take
 * about 20 seconds.
 */
function englishCityIndex(): Map<string, string> {
  if (!englishCityByZone) {
    englishCityByZone = new Map();
    for (const timezone of getTimeZones()) {
      const city = timezone.mainCities[0] ?? timezone.name;
      englishCityByZone.set(timezone.name, city);
      for (const alias of timezone.group) {
        if (!englishCityByZone.has(alias)) {
          englishCityByZone.set(alias, city);
        }
      }
    }
  }
  return englishCityByZone;
}

function englishTimeZoneCity(iana: string): string | undefined {
  if (!iana) {
    return undefined;
  }
  if (iana === "UTC") {
    return "UTC";
  }
  return englishCityIndex().get(iana);
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
