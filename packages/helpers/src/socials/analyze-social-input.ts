import {
  type ContactSocialFieldCommitAction,
  type ContactSocialFieldKey,
  normalizePhoneSocialValue,
  processContactSocialFieldValue,
  resolveContactSocialFieldCommit,
} from "#socials/socials-helpers.js";
import { normalizeWebsiteUrl } from "#socials/normalize-website-url.js";

export type SocialInputRerouteReason = "wrong_platform" | "looks_like_phone" | "looks_like_website";

export type AnalyzeSocialFieldInputResult =
  | { outcome: "commit"; action: ContactSocialFieldCommitAction }
  | {
      outcome: "suggest_reroute";
      suggestedField: ContactSocialFieldKey;
      value: string;
      reason: SocialInputRerouteReason;
      targetHasValue: boolean;
    };

export interface AnalyzeSocialFieldInputOptions {
  dialCode?: string;
  skipReroute?: boolean;
  persistedByField?: Partial<Record<ContactSocialFieldKey, string>>;
}

const HANDLE_FIELDS = new Set<ContactSocialFieldKey>(["linkedin", "instagram", "facebook"]);

function detectPlatformFromUrl(input: string): ContactSocialFieldKey | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (/instagram\.com|instagr\.am/i.test(trimmed)) {
    return "instagram";
  }

  if (/facebook\.com|fb\.com|m\.facebook\.com/i.test(trimmed)) {
    return "facebook";
  }

  if (/linkedin\.com/i.test(trimmed)) {
    return "linkedin";
  }

  if (/wa\.me|api\.whatsapp\.com/i.test(trimmed)) {
    return "whatsapp";
  }

  if (/signal\.me/i.test(trimmed)) {
    return "signal";
  }

  return null;
}

function looksLikePhone(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7) {
    return false;
  }

  if (trimmed.startsWith("+")) {
    return true;
  }

  const nonSpace = trimmed.replace(/\s/g, "");
  const nonDigitChars = nonSpace.replace(/\d/g, "").length;
  return nonDigitChars <= 2;
}

function looksLikeGenericWebsite(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return false;
  }

  if (detectPlatformFromUrl(trimmed)) {
    return false;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.includes(".")) {
    return normalizeWebsiteUrl(trimmed) !== null;
  }

  return false;
}

function getTargetHasValue(
  suggestedField: ContactSocialFieldKey,
  value: string,
  persistedByField?: Partial<Record<ContactSocialFieldKey, string>>,
): boolean {
  const targetPersisted = (persistedByField?.[suggestedField] ?? "").trim();
  if (!targetPersisted) {
    return false;
  }

  return targetPersisted !== value.trim();
}

function suggestReroute(
  fromField: ContactSocialFieldKey,
  suggestedField: ContactSocialFieldKey,
  rawValue: string,
  reason: SocialInputRerouteReason,
  options?: AnalyzeSocialFieldInputOptions,
): AnalyzeSocialFieldInputResult | null {
  if (suggestedField === fromField) {
    return null;
  }

  const processed = processContactSocialFieldValue(suggestedField, rawValue, {
    dialCode: options?.dialCode,
  });

  if (processed.error || !processed.value) {
    return null;
  }

  return {
    outcome: "suggest_reroute",
    suggestedField,
    value: processed.value,
    reason,
    targetHasValue: getTargetHasValue(suggestedField, processed.value, options?.persistedByField),
  };
}

/**
 * Analyzes social field input for commit vs. cross-field reroute suggestions.
 */
export function analyzeSocialFieldInput(
  field: ContactSocialFieldKey,
  rawValue: string,
  persistedValue: string,
  options?: AnalyzeSocialFieldInputOptions,
): AnalyzeSocialFieldInputResult {
  const action = resolveContactSocialFieldCommit(field, rawValue, persistedValue, {
    dialCode: options?.dialCode,
  });

  if (action.action === "noop" || action.action === "clear" || action.action === "error") {
    return { outcome: "commit", action };
  }

  if (options?.skipReroute) {
    return { outcome: "commit", action };
  }

  const inputValue = rawValue.trim();
  if (!inputValue) {
    return { outcome: "commit", action };
  }

  const detectedPlatform = detectPlatformFromUrl(inputValue);
  if (detectedPlatform) {
    const reroute = suggestReroute(field, detectedPlatform, inputValue, "wrong_platform", options);
    if (reroute) {
      return reroute;
    }
  }

  if (HANDLE_FIELDS.has(field)) {
    if (looksLikeGenericWebsite(inputValue)) {
      const websiteValue = normalizeWebsiteUrl(inputValue);
      if (websiteValue) {
        const reroute = suggestReroute(field, "website", inputValue, "looks_like_website", options);
        if (reroute) {
          return reroute;
        }
      }
    }

    if (looksLikePhone(inputValue)) {
      const phoneValue = normalizePhoneSocialValue("whatsapp", inputValue);
      if (phoneValue) {
        const reroute = suggestReroute(field, "whatsapp", inputValue, "looks_like_phone", options);
        if (reroute) {
          return reroute;
        }
      }
    }
  }

  if (field === "website" && looksLikePhone(inputValue)) {
    const phoneValue = normalizePhoneSocialValue("whatsapp", inputValue);
    if (phoneValue) {
      const reroute = suggestReroute(field, "whatsapp", inputValue, "looks_like_phone", options);
      if (reroute) {
        return reroute;
      }
    }
  }

  return { outcome: "commit", action };
}
