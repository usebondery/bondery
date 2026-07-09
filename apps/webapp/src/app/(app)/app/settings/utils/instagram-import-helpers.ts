import type { Contact, InstagramPreparedContact } from "@bondery/schemas";

export const INSTAGRAM_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export type InstagramImportStep =
  | "intro"
  | "instructions"
  | "upload"
  | "strategy"
  | "processing"
  | "preview";

export const INSTAGRAM_STEP_PROGRESS: Record<InstagramImportStep, number> = {
  instructions: 24,
  intro: 10,
  preview: 84,
  processing: 70,
  strategy: 56,
  upload: 40,
};

export function readNumberField(data: Record<string, unknown> | null, key: string): number {
  const value = data?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

type ZipValidationError = "no-file" | "file-too-large" | "invalid-extension" | "invalid-mime";

const ACCEPTED_ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip",
  "application/octet-stream",
  "",
]);

export function validateInstagramZipFile(
  file: File | null,
): { valid: true; file: File } | { valid: false; code: ZipValidationError } {
  if (!file) {
    return { code: "no-file", valid: false };
  }

  const normalizedName = file.name.toLowerCase();
  const normalizedType = (file.type || "").toLowerCase();

  if (!normalizedName.endsWith(".zip")) {
    return { code: "invalid-extension", valid: false };
  }

  if (file.size > INSTAGRAM_MAX_FILE_SIZE_BYTES) {
    return { code: "file-too-large", valid: false };
  }

  if (!ACCEPTED_ZIP_MIME_TYPES.has(normalizedType)) {
    return { code: "invalid-mime", valid: false };
  }

  return { file, valid: true };
}

export type ZipValidationErrorCode = ZipValidationError;

export function toInstagramPreviewContact(contact: InstagramPreparedContact): Contact {
  return {
    avatar: null,
    createdAt: new Date().toISOString(),
    emails: [],
    facebook: null,
    firstName: contact.firstName,
    gisPoint: null,
    headline: null,
    id: contact.tempId,
    importantDates: null,
    instagram: contact.instagramUrl,
    keepFrequencyDays: null,
    language: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    lastName: contact.lastName,
    latitude: null,
    linkedin: null,
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

export function sortInstagramContactsForPreview(
  contacts: InstagramPreparedContact[],
): InstagramPreparedContact[] {
  return contacts
    .map((contact, index) => ({ contact, index }))
    .sort((left, right) => {
      const leftRank =
        left.contact.isValid && left.contact.likelyPerson && !left.contact.alreadyExists
          ? 0
          : left.contact.isValid && !left.contact.likelyPerson && !left.contact.alreadyExists
            ? 1
            : left.contact.alreadyExists
              ? 2
              : 3;
      const rightRank =
        right.contact.isValid && right.contact.likelyPerson && !right.contact.alreadyExists
          ? 0
          : right.contact.isValid && !right.contact.likelyPerson && !right.contact.alreadyExists
            ? 1
            : right.contact.alreadyExists
              ? 2
              : 3;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.contact);
}
