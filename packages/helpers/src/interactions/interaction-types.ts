/**
 * Runtime array of all valid interaction type values.
 * Lives in @bondery/helpers (behavior layer) — helpers may depend on schemas, never the reverse.
 * The corresponding `InteractionType` union is in @bondery/schemas (contract layer).
 */
export const INTERACTION_TYPES = [
  "Call",
  "Coffee",
  "Email",
  "Meal",
  "Meeting",
  "Networking event",
  "Note",
  "Other",
  "Party/Social",
  "Text/Messaging",
  "Competition/Hackathon",
  "Custom",
] as const;
