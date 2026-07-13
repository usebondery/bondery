import type { EmailEntry, PhoneEntry } from "@bondery/schemas";

export const MAX_CONTACT_CHANNELS = 5;

export function createDraftPhone(preferred = false): PhoneEntry {
  return {
    preferred,
    prefix: "+1",
    type: "home",
    value: "",
  };
}

export function createDraftEmail(preferred = false): EmailEntry {
  return {
    preferred,
    type: "home",
    value: "",
  };
}

export function normalizePhonesForSave(phones: PhoneEntry[]): PhoneEntry[] {
  const phonesToSave = phones
    .filter((phone) => phone.value.trim() !== "")
    .map((phone) => ({
      preferred: phone.preferred === true,
      prefix: phone.prefix?.trim() || "+1",
      type: phone.type === "work" ? ("work" as const) : ("home" as const),
      value: phone.value.trim(),
    }));

  if (phonesToSave.length > 0 && !phonesToSave.some((phone) => phone.preferred)) {
    phonesToSave[0] = { ...phonesToSave[0], preferred: true };
  }

  return phonesToSave;
}

export function normalizeEmailsForSave(emails: EmailEntry[]): EmailEntry[] {
  const emailsToSave = emails
    .filter((email) => email.value.trim() !== "")
    .map((email) => ({
      preferred: email.preferred === true,
      type: email.type === "work" ? ("work" as const) : ("home" as const),
      value: email.value.trim(),
    }));

  if (emailsToSave.length > 0 && !emailsToSave.some((email) => email.preferred)) {
    emailsToSave[0] = { ...emailsToSave[0], preferred: true };
  }

  return emailsToSave;
}

export function applyPreferredPhone(phones: PhoneEntry[], preferredIndex: number): PhoneEntry[] {
  return phones.map((phone, index) => ({
    ...phone,
    preferred: index === preferredIndex,
  }));
}

export function applyPreferredEmail(emails: EmailEntry[], preferredIndex: number): EmailEntry[] {
  return emails.map((email, index) => ({
    ...email,
    preferred: index === preferredIndex,
  }));
}
