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
      const resolveLeftRank = () => {
        if (left.contact.isValid && !left.contact.alreadyExists) {
          return 0;
        }
        if (left.contact.alreadyExists) {
          return 1;
        }
        return 2;
      };
      const leftRank = resolveLeftRank();
      const resolveRightRank = () => {
        if (right.contact.isValid && !right.contact.alreadyExists) {
          return 0;
        }
        if (right.contact.alreadyExists) {
          return 1;
        }
        return 2;
      };
      const rightRank = resolveRightRank();

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.contact);
}
