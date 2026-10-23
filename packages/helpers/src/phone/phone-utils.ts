import {
  type NormalizePhoneResult,
  normalizePhoneInput,
  normalizePhoneParts,
} from "#phone/phone-normalize.js";

/**
 * Parse a phone number and extract country code and number.
 * National numbers require `defaultCountry` — no silent `+1` fallback.
 *
 * @deprecated Prefer `normalizePhoneInput` or `normalizePhoneParts`.
 */
export function parsePhoneNumber(
  phoneNumber: string,
  defaultCountry?: string | null,
): {
  dialCode: string;
  number: string;
} | null {
  if (!phoneNumber?.trim()) {
    return null;
  }

  const trimmed = phoneNumber.trim();
  const hasInternationalMarker =
    trimmed.startsWith("+") || trimmed.startsWith("00") || trimmed.includes("+");

  const normalized: NormalizePhoneResult = hasInternationalMarker
    ? normalizePhoneInput(trimmed, { defaultCountry })
    : defaultCountry
      ? normalizePhoneInput(trimmed, { defaultCountry })
      : { error: "missing_default_country" };

  if ("error" in normalized) {
    return null;
  }

  return {
    dialCode: normalized.prefix,
    number: normalized.value,
  };
}

/**
 * Format a phone number for display
 * @param phoneNumber - Full phone number
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string, defaultCountry?: string | null): string {
  const parsed = parsePhoneNumber(phoneNumber, defaultCountry);
  if (!parsed) {
    return phoneNumber;
  }

  const { dialCode, number } = parsed;

  // Simple formatting: add spaces every 3-4 digits
  const formatted = number.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");

  return `${dialCode} ${formatted}`;
}

/**
 * Combine dial code and number into full phone number
 * @param dialCode - Country dial code (e.g., "+1")
 * @param number - Phone number without country code
 * @returns Full phone number
 */
export function combinePhoneNumber(dialCode: string, number: string): string {
  const cleanNumber = number.replace(/\D/g, "");
  return dialCode + cleanNumber;
}

/**
 * Parses prefix + national value using the same rules as API storage.
 */
export function parsePhoneParts(
  prefix: string,
  value: string,
  defaultCountry?: string | null,
): { dialCode: string; number: string } | null {
  const normalized = normalizePhoneParts(prefix, value, { defaultCountry });
  if ("error" in normalized) {
    return null;
  }

  return {
    dialCode: normalized.prefix,
    number: normalized.value,
  };
}
