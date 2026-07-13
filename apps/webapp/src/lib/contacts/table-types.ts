/** Contacts table column identifiers (People, Groups, Map side panel). */
export type ColumnKey =
  | "name"
  | "headline"
  | "location"
  | "lastInteraction"
  | "social"
  | "phone"
  | "email"
  | "avatar";

/** Server-backed sort options for contact lists. */
export type SortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc"
  | "createdAtAsc"
  | "createdAtDesc";
