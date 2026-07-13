/** Shared query params for person detail page prefetch + client hooks. */

export {
  INTERACTIONS_TIMELINE as PERSON_INTERACTIONS,
  SELECTABLE_CONTACTS as PERSON_SELECTABLE_CONTACTS,
} from "./sharedListParams";

export const PERSON_ALL_TAGS = { previewLimit: 0 } as const;

export const PERSON_MERGE_RECOMMENDATIONS = { declined: false } as const;
