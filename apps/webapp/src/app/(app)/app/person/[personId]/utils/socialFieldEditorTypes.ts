import type { ContactSocialFieldKey, SocialInputRerouteReason } from "@bondery/helpers";
import { parsePhoneNumber } from "@bondery/helpers/phone";
import type { Contact } from "@bondery/schemas";

export type SocialFieldKey = ContactSocialFieldKey;

export interface RerouteSuggestion {
  fromField: SocialFieldKey;
  reason: SocialInputRerouteReason;
  targetHasValue: boolean;
  toField: SocialFieldKey;
  value: string;
}

const SAVABLE_FIELDS = new Set<SocialFieldKey>([
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
]);

export function isSavableSocialField(field: string): field is SocialFieldKey {
  return SAVABLE_FIELDS.has(field as SocialFieldKey);
}

export type SocialFieldValues = Record<SocialFieldKey, string>;

export const SOCIAL_FIELD_CLOSE_DELAY_MS = 140;

export function getDisplayValues(contact: Contact): SocialFieldValues {
  const whatsappParsed = parsePhoneNumber(contact.whatsapp || "");
  const signalParsed = parsePhoneNumber(contact.signal || "");

  return {
    facebook: contact.facebook || "",
    instagram: contact.instagram || "",
    linkedin: contact.linkedin || "",
    signal: signalParsed?.number || "",
    website: contact.website || "",
    whatsapp: whatsappParsed?.number || "",
  };
}

export function getPersistedValues(contact: Contact): SocialFieldValues {
  return {
    facebook: contact.facebook || "",
    instagram: contact.instagram || "",
    linkedin: contact.linkedin || "",
    signal: contact.signal || "",
    website: contact.website || "",
    whatsapp: contact.whatsapp || "",
  };
}

export function getDisplayDraftForPersisted(field: SocialFieldKey, persistedValue: string): string {
  if (field === "whatsapp" || field === "signal") {
    return parsePhoneNumber(persistedValue)?.number || "";
  }

  return persistedValue;
}

export function createEmptySavingByField(): Record<SocialFieldKey, boolean> {
  return {
    facebook: false,
    instagram: false,
    linkedin: false,
    signal: false,
    website: false,
    whatsapp: false,
  };
}
