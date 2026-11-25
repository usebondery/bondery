import type { InstagramPreparedContact } from "@bondery/schemas";

type ZipValidationError = "no-file" | "file-too-large" | "invalid-extension" | "invalid-mime";

const ACCEPTED_ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip",
  "application/octet-stream",
  "",
]);

export const INSTAGRAM_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export type InstagramImportStep =
  | "intro"
  | "instructions"
  | "upload"
  | "strategy"
  | "processing"
  | "preview"
  | "finished";

export const INSTAGRAM_STEP_PROGRESS: Record<InstagramImportStep, number> = {
  finished: 100,
  instructions: 24,
  intro: 10,
  preview: 84,
  processing: 70,
  strategy: 56,
  upload: 40,
};

export function readNumberField(data: object | null, key: string): number {
  const value = data && key in data ? (data as Record<string, unknown>)[key] : undefined;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

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

export function sortInstagramContactsForPreview(
  contacts: InstagramPreparedContact[],
): InstagramPreparedContact[] {
  return contacts
    .map((contact, index) => ({ contact, index }))
    .sort((left, right) => {
      const resolveLeftRank = () => {
        if (left.contact.isValid && left.contact.likelyPerson && !left.contact.alreadyExists) {
          return 0;
        }
        if (left.contact.isValid && !left.contact.likelyPerson && !left.contact.alreadyExists) {
          return 1;
        }
        if (left.contact.alreadyExists) {
          return 2;
        }
        return 3;
      };
      const leftRank = resolveLeftRank();
      const resolveRightRank = () => {
        if (right.contact.isValid && right.contact.likelyPerson && !right.contact.alreadyExists) {
          return 0;
        }
        if (right.contact.isValid && !right.contact.likelyPerson && !right.contact.alreadyExists) {
          return 1;
        }
        if (right.contact.alreadyExists) {
          return 2;
        }
        return 3;
      };
      const rightRank = resolveRightRank();

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.contact);
}
