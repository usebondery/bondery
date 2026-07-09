export const PERSON_TABS = ["interactions", "about", "organize", "linkedin"] as const;
export type PersonTabValue = (typeof PERSON_TABS)[number];
export const DEFAULT_PERSON_TAB: PersonTabValue = "interactions";
