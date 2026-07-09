import type { Contact, LinkedInPreparedContact } from "@bondery/schemas";

export type LinkedInImportStep = "intro" | "instructions" | "upload" | "processing" | "preview";

export const LINKEDIN_STEP_PROGRESS: Record<LinkedInImportStep, number> = {
  instructions: 30,
  intro: 12,
  preview: 84,
  processing: 68,
  upload: 50,
};

function buildImportedTitle(position: string | null, company: string | null): string | null {
  const normalizedPosition = typeof position === "string" ? position.trim() : "";
  const normalizedCompany = typeof company === "string" ? company.trim() : "";

  if (normalizedPosition && normalizedCompany) {
    return `${normalizedPosition} @${normalizedCompany}`;
  }

  if (normalizedPosition) {
    return normalizedPosition;
  }

  return normalizedCompany || null;
}

export function toLinkedInPreviewContact(contact: LinkedInPreparedContact): Contact {
  return {
    avatar: null,
    createdAt: new Date().toISOString(),
    emails: [],
    facebook: null,
    firstName: contact.firstName,
    gisPoint: null,
    headline: buildImportedTitle(contact.position, contact.company),
    id: contact.tempId,
    importantDates: null,
    instagram: null,
    keepFrequencyDays: null,
    language: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    lastName: contact.lastName,
    latitude: null,
    linkedin: contact.linkedinUrl,
    location: null,
    longitude: null,
    middleName: contact.middleName,
    myself: false,
    notes: null,
    phones: [],
    signal: null,
    timezone: null,
    updatedAt: new Date().toISOString(),
    userId: "",
    website: null,
    whatsapp: null,
  };
}

export function sortLinkedInContactsForPreview(
  contacts: LinkedInPreparedContact[],
): LinkedInPreparedContact[] {
  return contacts
    .map((contact, index) => ({ contact, index }))
    .sort((left, right) => {
      const leftRank =
        left.contact.isValid && !left.contact.alreadyExists
          ? 0
          : left.contact.alreadyExists
            ? 1
            : 2;
      const rightRank =
        right.contact.isValid && !right.contact.alreadyExists
          ? 0
          : right.contact.alreadyExists
            ? 1
            : 2;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.contact);
}
