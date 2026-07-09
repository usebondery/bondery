import { SORTED_COUNTRY_CODES_BY_DIAL_LENGTH } from "#phone/country-codes.js";

/**
 * Parse a phone number and extract country code and number
 * @param phoneNumber - Full phone number with or without +
 * @returns Object with dialCode and number, or null if invalid
 */
export function parsePhoneNumber(phoneNumber: string): {
  dialCode: string;
  number: string;
} | null {
  if (!phoneNumber) {
    return null;
  }

  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }

  // Try to match against known country codes (longest first)
  for (const country of SORTED_COUNTRY_CODES_BY_DIAL_LENGTH) {
    if (cleaned.startsWith(country.dialCode)) {
      return {
        dialCode: country.dialCode,
        number: cleaned.substring(country.dialCode.length),
      };
    }
  }

  // If no match, assume +1 (US/Canada) if starts with +1
  if (cleaned.startsWith("+1")) {
    return {
      dialCode: "+1",
      number: cleaned.substring(2),
    };
  }

  // Default: treat everything after + as area code + number
  return {
    dialCode: "+1",
    number: cleaned.substring(1),
  };
}

/**
 * Format a phone number for display
 * @param phoneNumber - Full phone number
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const parsed = parsePhoneNumber(phoneNumber);
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
