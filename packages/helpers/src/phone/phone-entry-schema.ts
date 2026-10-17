import { CONTACT_LIMITS, phoneEntryInputSchema } from "@bondery/schemas";
import { z } from "zod";
import { normalizePhoneParts } from "#phone/phone-normalize.js";

/**
 * Server/client phone row schema with normalization injected via default country.
 */
export function createPhoneEntrySchema(defaultCountry: string | null) {
  return phoneEntryInputSchema
    .superRefine((entry, context) => {
      const normalized = normalizePhoneParts(entry.prefix, entry.value, { defaultCountry });
      if ("error" in normalized) {
        context.addIssue({
          code: "custom",
          message: "Invalid phone number",
          path: ["value"],
        });
      }
    })
    .transform((entry) => {
      const normalized = normalizePhoneParts(entry.prefix, entry.value, { defaultCountry });
      if ("error" in normalized) {
        return {
          preferred: entry.preferred ?? false,
          prefix: entry.prefix.trim(),
          type: entry.type,
          value: entry.value.replace(/\D/g, ""),
        };
      }

      return {
        preferred: entry.preferred ?? false,
        prefix: normalized.prefix,
        type: entry.type,
        value: normalized.value,
      };
    });
}

export function createReplacePhonesSchema(defaultCountry: string | null) {
  return z.array(createPhoneEntrySchema(defaultCountry)).max(CONTACT_LIMITS.maxPhones, {
    error: `Maximum of ${CONTACT_LIMITS.maxPhones} phone numbers allowed`,
  });
}
