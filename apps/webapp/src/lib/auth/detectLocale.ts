import { TIMEZONES_DATA } from "@/lib/timezones";

/**
 * ISO 3166-1 alpha-2 country codes (lowercase) that conventionally use
 * 12-hour (AM/PM) time format. All other countries default to 24-hour.
 *
 * Sources: Unicode CLDR, Wikipedia "12-hour clock"
 */
const TWELVE_HOUR_COUNTRIES = new Set([
  "us", // United States
  "ca", // Canada
  "au", // Australia
  "nz", // New Zealand
  "in", // India
  "pk", // Pakistan
  "bd", // Bangladesh
  "my", // Malaysia
  "ph", // Philippines
  "gb", // United Kingdom
  "ie", // Ireland
  "eg", // Egypt
  "sa", // Saudi Arabia
  "ae", // United Arab Emirates
  "jo", // Jordan
  "kw", // Kuwait
  "om", // Oman
  "bh", // Bahrain
  "qa", // Qatar
  "mx", // Mexico
]);

/**
 * Determines the time format convention for a given timezone by looking up
 * its country code in TIMEZONES_DATA and checking against known 12-hour countries.
 * This is more reliable than browser Intl detection, which Chrome on Windows
 * often resolves incorrectly regardless of OS settings.
 *
 * @param timezone A normalized IANA timezone value from TIMEZONES_DATA.
 * @returns "12h" or "24h"
 */
function detectTimeFormat(timezone: string): "12h" | "24h" {
  const entry = TIMEZONES_DATA.find((tz) => tz.value === timezone);
  if (!entry || !entry.flag) return "24h";
  return TWELVE_HOUR_COUNTRIES.has(entry.flag) ? "12h" : "24h";
}

/**
 * Normalizes a browser-detected IANA timezone identifier to one that exists in
 * TIMEZONES_DATA. Browsers can return legacy/alias identifiers (e.g. "America/Indianapolis")
 * that are not the canonical `name` in the picker list.
 *
 * Resolution order:
 * 1. Exact match on `value` → use as-is
 * 2. Alias match via `group` array (handles all IANA deprecated links) → use the canonical entry
 * 3. Complete failure → fall back to "UTC"
 *
 * @param rawTimezone IANA timezone string reported by the browser.
 * @returns A timezone value guaranteed to exist in TIMEZONES_DATA.
 */
function normalizeTimezone(rawTimezone: string): string {
  // 1. Exact match on canonical name
  if (TIMEZONES_DATA.some((tz) => tz.value === rawTimezone)) {
    return rawTimezone;
  }

  // 2. Match via group (covers deprecated aliases like America/Indianapolis)
  const grouped = TIMEZONES_DATA.find((tz) => tz.group.includes(rawTimezone));
  if (grouped) {
    return grouped.value;
  }

  return "UTC";
}

/**
 * Detects the user's timezone and time format preference from the browser environment.
 * The timezone is normalized to a value that exists in the timezone picker (TIMEZONES_DATA).
 * The time format is derived from the timezone's country convention rather than browser
 * Intl detection, which is unreliable on Windows/Chrome.
 * Falls back to safe defaults if detection fails or runs server-side.
 *
 * @returns Object with a picker-compatible IANA timezone string and time format preference.
 */
export function detectBrowserLocale(): {
  timezone: string;
  timeFormat: "12h" | "24h";
} {
  try {
    const rawTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const timezone = normalizeTimezone(rawTimezone);
    const timeFormat = detectTimeFormat(timezone);

    return { timezone, timeFormat };
  } catch {
    return { timezone: "UTC", timeFormat: "24h" };
  }
}

/** Cookie name used to pass detected locale preferences through the OAuth redirect */
export const LOCALE_PREFS_COOKIE = "locale_prefs";

/**
 * Sets a short-lived cookie with the user's detected locale preferences.
 * This cookie is read by the auth callback route to apply the preferences
 * to the new user's settings row.
 */
export function setLocalePreferencesCookie(): void {
  const prefs = detectBrowserLocale();
  const maxAge = 600; // 10 minutes — enough time to complete OAuth flow
  document.cookie = `${LOCALE_PREFS_COOKIE}=${encodeURIComponent(JSON.stringify(prefs))};path=/;max-age=${maxAge};SameSite=Lax`;
}
