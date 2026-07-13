import type { UpdateContactInput } from "@bondery/schemas";

const MERGE_IDENTITY_PATCH_KEYS = [
  "firstName",
  "middleName",
  "lastName",
  "phones",
  "emails",
  "linkedin",
  "facebook",
] as const satisfies readonly (keyof UpdateContactInput)[];

/** True when a contact patch can change merge-recommendation matching inputs. */
export function patchAffectsMergeRecommendations(patch: UpdateContactInput): boolean {
  return MERGE_IDENTITY_PATCH_KEYS.some((key) => Object.hasOwn(patch, key));
}
