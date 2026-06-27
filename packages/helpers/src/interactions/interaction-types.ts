/**
 * Runtime array of all valid interaction type values.
 * Kept in @bondery/helpers (a built package) rather than @bondery/schemas
 * so it can be safely imported by both the API (Node.js ESM) and
 * the webapp (webpack) without CJS/ESM interop issues.
 *
 * The corresponding `InteractionType` union is in @bondery/schemas.
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
