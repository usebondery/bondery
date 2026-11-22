import type { MergeConflictChoice, MergeConflictField } from "@bondery/schemas";

export function swapMergeConflictChoices(
  choices: Partial<Record<MergeConflictField, MergeConflictChoice>>,
): Partial<Record<MergeConflictField, MergeConflictChoice>> {
  const swapped: Partial<Record<MergeConflictField, MergeConflictChoice>> = {};
  for (const [field, choice] of Object.entries(choices) as [
    MergeConflictField,
    MergeConflictChoice,
  ][]) {
    swapped[field] = choice === "left" ? "right" : "left";
  }
  return swapped;
}

/** Keep `survivorPersonId` as the merge-left (surviving) contact when it is one of the pair. */
export function orientMergePair(input: {
  conflictChoices: Partial<Record<MergeConflictField, MergeConflictChoice>>;
  leftPersonId: string;
  rightPersonId: string;
  survivorPersonId?: string;
}): {
  conflictChoices: Partial<Record<MergeConflictField, MergeConflictChoice>>;
  leftPersonId: string;
  rightPersonId: string;
} {
  if (input.survivorPersonId && input.survivorPersonId === input.rightPersonId) {
    return {
      conflictChoices: swapMergeConflictChoices(input.conflictChoices),
      leftPersonId: input.rightPersonId,
      rightPersonId: input.leftPersonId,
    };
  }

  return {
    conflictChoices: input.conflictChoices,
    leftPersonId: input.leftPersonId,
    rightPersonId: input.rightPersonId,
  };
}
