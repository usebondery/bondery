import { getTelephoneReactMaskExpression } from "@bondery/helpers/phone";
import type { Contact } from "@bondery/schemas";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas/entities/channels";

export function getPreferredEmail(emails: Contact["emails"]): EmailEntry | undefined {
  const list = Array.isArray(emails) ? emails : [];
  const preferred = list.find((e) => e?.preferred) ?? list[0];
  return preferred && typeof preferred === "object" && "value" in preferred ? preferred : undefined;
}

export function getPreferredPhone(phones: Contact["phones"]): PhoneEntry | undefined {
  const list = Array.isArray(phones) ? phones : [];
  const preferred = list.find((p) => p?.preferred) ?? list[0];
  return preferred && typeof preferred === "object" && "value" in preferred ? preferred : undefined;
}

/**
 * Formats a phone number for display using the appropriate country mask.
 */
export function formatPhoneForDisplay(prefix: string, value: string): string {
  if (!value) {
    return prefix || "";
  }

  const mask = getTelephoneReactMaskExpression(prefix);
  const digits = value.replace(/\D/g, "");

  let formatted = "";
  let digitIndex = 0;

  for (const char of mask) {
    if (char === "0" && digitIndex < digits.length) {
      formatted += digits[digitIndex];
      digitIndex++;
    } else if (char !== "0") {
      formatted += char;
    }
  }

  if (digitIndex < digits.length) {
    formatted += digits.slice(digitIndex);
  }

  return [prefix, formatted.trim()].filter(Boolean).join(" ");
}
