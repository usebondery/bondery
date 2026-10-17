import { countryCodes } from "#phone/country-codes.js";
import { getCountryCodeForTimezone } from "#phone/phone-default-country.js";

export type NormalizedPhone = {
  identityKey: string;
  prefix: string;
  value: string;
};

export type NormalizePhoneError = {
  error: "empty" | "invalid" | "missing_default_country";
};

export type NormalizePhoneResult = NormalizedPhone | NormalizePhoneError;

export type DefaultPhoneCountrySettings = {
  defaultPhoneCountry?: string | null;
  timezone?: string | null;
};

const STRIP_LEADING_ZERO_COUNTRIES = new Set([
  "AT",
  "AU",
  "BE",
  "CH",
  "CZ",
  "DE",
  "ES",
  "FR",
  "GB",
  "GR",
  "HU",
  "IE",
  "IN",
  "IT",
  "NL",
  "NZ",
  "PL",
  "PT",
  "RO",
  "SE",
  "SK",
  "ZA",
]);

const NATIONAL_LENGTH_BY_DIAL: Record<string, { max: number; min: number }> = {
  "1": { max: 10, min: 10 },
  "44": { max: 10, min: 10 },
  "49": { max: 11, min: 10 },
  "420": { max: 9, min: 9 },
};

const DEFAULT_NATIONAL_LENGTH = { max: 15, min: 4 };

const PRIMARY_COUNTRY_BY_DIAL = new Map<string, string>([
  ["1", "US"],
  ["7", "RU"],
  ["44", "GB"],
  ["420", "CZ"],
  ["49", "DE"],
]);

type DialCodeEntry = {
  countryCode: string;
  dialDigits: string;
  prefix: string;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Canonical E.164-style prefix for storage and matching (`+1-268` → `+1268`). */
export function canonicalizeDialCode(dialCode: string): string {
  const digits = digitsOnly(dialCode);
  return digits ? `+${digits}` : "";
}

/** Human-readable calling code (`+1-268` → `+1 268`, `+420` → `+420`). */
export function formatDialCodeForDisplay(dialCode: string): string {
  const digits = digitsOnly(dialCode);
  if (!digits) {
    return "";
  }

  if (digits.startsWith("1") && digits.length > 1) {
    return `+1 ${digits.slice(1)}`;
  }

  return `+${digits}`;
}

function normalizeDialCodeDisplay(dialCode: string): string {
  return canonicalizeDialCode(dialCode);
}

const DIAL_CODE_ENTRIES: DialCodeEntry[] = (() => {
  const seen = new Set<string>();
  const entries: DialCodeEntry[] = [];

  for (const country of countryCodes) {
    const dialDigits = digitsOnly(country.dialCode);
    if (!dialDigits || seen.has(dialDigits)) {
      continue;
    }
    seen.add(dialDigits);
    entries.push({
      countryCode: country.code,
      dialDigits,
      prefix: normalizeDialCodeDisplay(country.dialCode),
    });
  }

  return entries.sort((a, b) => b.dialDigits.length - a.dialDigits.length);
})();

function buildNormalized(prefix: string, nationalDigits: string): NormalizedPhone {
  const cleanPrefix = normalizeDialCodeDisplay(prefix);
  const cleanNational = digitsOnly(nationalDigits);
  return {
    identityKey: phoneIdentityKey(cleanPrefix, cleanNational),
    prefix: cleanPrefix,
    value: cleanNational,
  };
}

function stripNationalTrunkZero(nationalDigits: string, countryCode: string | null): string {
  if (!countryCode || !STRIP_LEADING_ZERO_COUNTRIES.has(countryCode)) {
    return nationalDigits;
  }

  if (nationalDigits.startsWith("0") && nationalDigits.length > 1) {
    return nationalDigits.slice(1);
  }

  return nationalDigits;
}

function validateNationalLength(dialDigits: string, nationalDigits: string): boolean {
  const rule = NATIONAL_LENGTH_BY_DIAL[dialDigits] ?? DEFAULT_NATIONAL_LENGTH;
  const length = nationalDigits.length;
  return length >= rule.min && length <= rule.max;
}

function matchInternationalDigits(allDigits: string): NormalizedPhone | null {
  for (const entry of DIAL_CODE_ENTRIES) {
    if (!allDigits.startsWith(entry.dialDigits)) {
      continue;
    }

    const national = allDigits.slice(entry.dialDigits.length);
    const stripped = stripNationalTrunkZero(national, entry.countryCode);
    if (!validateNationalLength(entry.dialDigits, stripped)) {
      continue;
    }

    return buildNormalized(entry.prefix, stripped);
  }

  return null;
}

/**
 * ISO-3166 alpha-2 → E.164 calling code (e.g. `CZ` → `+420`).
 */
export function countryToCallingCode(countryCode: string): string | null {
  const upper = countryCode.trim().toUpperCase();
  if (upper.length !== 2) {
    return null;
  }

  const match = countryCodes.find((country) => country.code === upper);
  return match ? normalizeDialCodeDisplay(match.dialCode) : null;
}

/**
 * E.164 prefix → default ISO country when several share a dial code (e.g. `+1` → `US`).
 */
export function callingCodeToDefaultCountry(dialCode: string): string | null {
  const dialDigits = digitsOnly(dialCode);
  if (!dialDigits) {
    return null;
  }

  const primary = PRIMARY_COUNTRY_BY_DIAL.get(dialDigits);
  if (primary) {
    return primary;
  }

  const match = countryCodes.find((country) => digitsOnly(country.dialCode) === dialDigits);
  return match?.code ?? null;
}

/**
 * User settings fallback: explicit default country, then timezone-derived country.
 */
export function resolveDefaultPhoneCountry(settings: DefaultPhoneCountrySettings): string | null {
  const explicit = settings.defaultPhoneCountry?.trim().toUpperCase();
  if (explicit && explicit.length === 2) {
    return explicit;
  }

  if (settings.timezone) {
    return getCountryCodeForTimezone(settings.timezone);
  }

  return null;
}

/**
 * Digits-only identity for merge/dedup (no `+`, no formatting).
 */
export function phoneIdentityKey(prefix: string, value: string): string {
  return digitsOnly(prefix) + digitsOnly(value);
}

/**
 * Normalizes free-form phone input using an optional default country for national numbers.
 */
export function normalizePhoneInput(
  raw: string,
  options?: { defaultCountry?: string | null },
): NormalizePhoneResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "empty" };
  }

  const hasInternationalMarker =
    trimmed.startsWith("+") || trimmed.startsWith("00") || trimmed.includes("+");

  if (hasInternationalMarker) {
    let allDigits = digitsOnly(trimmed);
    if (trimmed.trimStart().startsWith("00")) {
      allDigits = allDigits.replace(/^00+/, "");
    }

    const matched = matchInternationalDigits(allDigits);
    if (matched) {
      return matched;
    }

    return { error: "invalid" };
  }

  const defaultCountry = options?.defaultCountry?.trim().toUpperCase() ?? null;
  const dialCode = defaultCountry ? countryToCallingCode(defaultCountry) : null;
  if (!dialCode) {
    return { error: "missing_default_country" };
  }

  const dialDigits = digitsOnly(dialCode);
  let national = digitsOnly(trimmed);
  national = stripNationalTrunkZero(national, defaultCountry);

  if (!validateNationalLength(dialDigits, national)) {
    return { error: "invalid" };
  }

  return buildNormalized(dialCode, national);
}

/**
 * Normalizes stored contact phone parts (`prefix` + national `value`).
 */
export function normalizePhoneParts(
  prefix: string,
  value: string,
  options?: { defaultCountry?: string | null },
): NormalizePhoneResult {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { error: "empty" };
  }

  if (trimmedValue.includes("+") || trimmedValue.startsWith("00")) {
    return normalizePhoneInput(trimmedValue, options);
  }

  const trimmedPrefix = prefix.trim();
  const effectivePrefix =
    trimmedPrefix ||
    (options?.defaultCountry ? countryToCallingCode(options.defaultCountry) : null) ||
    "";

  if (!effectivePrefix) {
    return normalizePhoneInput(trimmedValue, options);
  }

  const countryForTrunk =
    callingCodeToDefaultCountry(effectivePrefix) ??
    options?.defaultCountry?.trim().toUpperCase() ??
    null;

  const dialDigits = digitsOnly(effectivePrefix);
  let national = digitsOnly(trimmedValue);
  national = stripNationalTrunkZero(national, countryForTrunk);

  if (!validateNationalLength(dialDigits, national)) {
    const international = normalizePhoneInput(`+${national}`, options);
    if (!("error" in international)) {
      return international;
    }

    return { error: "invalid" };
  }

  return buildNormalized(effectivePrefix, national);
}

/**
 * Parses clipboard or free-form paste into stored prefix + national value.
 * Use with an empty prefix so international markers (`+`, `00`) are honored.
 */
export function resolveTelephonePaste(
  raw: string,
  options?: { defaultCountry?: string | null },
): NormalizedPhone | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = normalizePhoneParts("", trimmed, options);
  return "error" in parsed ? null : parsed;
}

/**
 * Normalizes a phone social field (WhatsApp / Signal) to E.164-style digits with `+`.
 */
export function normalizePhoneSocialStorage(
  raw: string,
  options?: { defaultCountry?: string | null; dialCode?: string },
): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  if (options?.dialCode && !trimmed.includes("+") && !trimmed.startsWith("00")) {
    const parts = normalizePhoneParts(options.dialCode, trimmed, options);
    if (!("error" in parts)) {
      return parts.prefix + parts.value;
    }
  }

  const normalized = normalizePhoneInput(trimmed, options);
  if ("error" in normalized) {
    const fallbackDigits = digitsOnly(trimmed);
    return fallbackDigits ? `+${fallbackDigits}` : "";
  }

  return normalized.prefix + normalized.value;
}
