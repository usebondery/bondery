import type { LinkedInPreparedContact } from "@bondery/schemas";

export type LinkedInImportStep =
  | "intro"
  | "instructions"
  | "upload"
  | "processing"
  | "preview"
  | "finished";

export const LINKEDIN_STEP_PROGRESS: Record<LinkedInImportStep, number> = {
  finished: 100,
  instructions: 30,
  intro: 12,
  preview: 84,
  processing: 68,
  upload: 50,
};

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
