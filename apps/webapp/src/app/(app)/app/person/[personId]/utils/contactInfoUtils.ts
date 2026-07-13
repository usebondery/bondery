import { CONTACT_LIMITS, type EmailEntry, type PhoneEntry } from "@bondery/schemas";

export const MAX_PHONE_ENTRIES = CONTACT_LIMITS.maxPhones;
export const MAX_EMAIL_ENTRIES = CONTACT_LIMITS.maxEmails;

export function createDraftPhone(): PhoneEntry {
  return {
    preferred: false,
    prefix: "+1",
    type: "home",
    value: "",
  };
}

export function createDraftEmail(): EmailEntry {
  return {
    preferred: false,
    type: "home",
    value: "",
  };
}
