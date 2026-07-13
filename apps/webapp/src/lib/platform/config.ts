/**
 * Application configuration constants
 */

import {
  CONTACT_ADDRESS_TYPE_OPTIONS,
  CONTACT_CHANNEL_TYPE_OPTIONS,
  IMPORTANT_DATE_TYPE_META,
} from "@bondery/helpers";
import { GEOCODE_SUGGEST_DEBOUNCE_MS } from "@bondery/helpers/address";
import type {
  ContactAddressType,
  ContactType,
  ImportantDateType,
  RelationshipType,
} from "@bondery/schemas";
import {
  CONTACT_FIELD_MAX_LENGTHS,
  CONTACT_LIMITS,
  AVATAR_UPLOAD as SCHEMA_AVATAR_UPLOAD,
} from "@bondery/schemas";

export const INPUT_MAX_LENGTHS = CONTACT_FIELD_MAX_LENGTHS;

export const FEATURES = {
  birthdayNotifications: true,
} as const;

/**
 * Global keyboard shortcuts used across the webapp.
 * Use `mod` for Ctrl on Windows/Linux and ⌘ on Mac.
 * Bare single-key shortcuts (e.g. "n") fire only when focus is outside inputs.
 */
export const HOTKEYS = {
  /** Open the "Add person" modal */
  ADD_PERSON: "c",
  /** Open the command palette (Ctrl+K / ⌘+K) */
  COMMAND_PALETTE: "mod+k",
  /** Open the "Find person" spotlight */
  FIND_PERSON: "f",
  /** Open the "Log interaction" modal */
  LOG_INTERACTION: "n",
  /** Toggle the navigation sidebar (Ctrl+B / ⌘+B) */
  SIDEBAR_TOGGLE: "mod+b",
} as const;

export const LIMITS = {
  maxAddresses: CONTACT_LIMITS.maxAddresses,
  maxImportantDates: CONTACT_LIMITS.maxImportantDates,
} as const;

/**
 * UI debounce delay constants (milliseconds).
 * Import these instead of hardcoding magic numbers.
 */
export const DEBOUNCE_MS = {
  /** Debounce for the contact picker's server-side search (PeopleMultiPickerInput). */
  contactPicker: 600,
  /** Debounce for local client-side filtering (no server call, e.g. emojis, table search). */
  localFilter: 200,
  /** Debounce inside LocationLookupInput before calling the map suggestion API. */
  locationSuggest: GEOCODE_SUGGEST_DEBOUNCE_MS,
  /** Delay after the user stops panning/zooming the map before fetching new pins. */
  mapViewport: 600,
  /** Delay for text search inputs before triggering a server/router fetch. */
  search: 600,
  /** @deprecated Use localFilter for client-side filtering. */
  tableSearch: 200,
} as const;

export const IMPORTANT_DATE_TYPE_OPTIONS: ReadonlyArray<{
  value: ImportantDateType;
  emoji: string;
}> = [
  { emoji: IMPORTANT_DATE_TYPE_META.birthday.emoji, value: "birthday" },
  { emoji: IMPORTANT_DATE_TYPE_META.anniversary.emoji, value: "anniversary" },
  { emoji: IMPORTANT_DATE_TYPE_META.nameday.emoji, value: "nameday" },
  { emoji: IMPORTANT_DATE_TYPE_META.graduation.emoji, value: "graduation" },
  { emoji: IMPORTANT_DATE_TYPE_META.other.emoji, value: "other" },
] as const;

export const IMPORTANT_DATE_NOTIFY_OPTIONS: ReadonlyArray<{
  value: "none" | "1" | "3" | "7";
}> = [{ value: "none" }, { value: "1" }, { value: "3" }, { value: "7" }] as const;

export const RELATIONSHIP_TYPE_OPTIONS: ReadonlyArray<{
  value: RelationshipType;
  emoji: string;
}> = [
  { emoji: "👨‍👩‍👧", value: "parent" },
  { emoji: "🧒", value: "child" },
  { emoji: "💍", value: "spouse" },
  { emoji: "❤️", value: "partner" },
  { emoji: "👫", value: "sibling" },
  { emoji: "🤝", value: "friend" },
  { emoji: "💼", value: "colleague" },
  { emoji: "🏡", value: "neighbor" },
  { emoji: "🛡️", value: "guardian" },
  { emoji: "🫶", value: "dependent" },
  { emoji: "🔗", value: "other" },
] as const;

export const CONTACT_METHOD_TYPE_OPTIONS: ReadonlyArray<{
  value: ContactType;
  emoji: string;
  label: string;
}> = CONTACT_CHANNEL_TYPE_OPTIONS.map((option) => ({
  ...option,
  label: option.value === "work" ? "Work" : "Home",
}));

export const PHONE_TYPE_OPTIONS: ReadonlyArray<{
  value: ContactType;
  emoji: string;
  label: string;
}> = CONTACT_METHOD_TYPE_OPTIONS;

export const EMAIL_TYPE_OPTIONS: ReadonlyArray<{
  value: ContactType;
  emoji: string;
  label: string;
}> = CONTACT_METHOD_TYPE_OPTIONS;

export const ADDRESS_TYPE_OPTIONS: ReadonlyArray<{
  value: ContactAddressType;
  emoji: string;
  label: string;
}> = CONTACT_ADDRESS_TYPE_OPTIONS.map((option) => ({
  ...option,
  label: option.value === "work" ? "Work" : option.value === "other" ? "Other" : "Home",
}));

/**
 * Avatar upload configuration
 */
export const AVATAR_UPLOAD = {
  allowedMimeTypes: SCHEMA_AVATAR_UPLOAD.allowedMimeTypes,
  maxFileSize: SCHEMA_AVATAR_UPLOAD.maxFileSizeBytes,
  maxFileSizeMB: SCHEMA_AVATAR_UPLOAD.maxFileSizeMB,
} as const;

// Doherty threshold, used for max function reply time
export const MAX_DOHERTY_THRESHOLD = 0.7;

/**
 * Integration providers configuration
 */
export const INTEGRATION_PROVIDERS = [
  {
    active: true,
    backgroundColor: "#0A66C2",
    displayName: "LinkedIn",
    icon: "linkedin",
    iconColor: "#0A66C2",
    provider: "linkedin",
    providerKey: "linkedin_oidc",
  },
  {
    active: true,
    backgroundColor: "black",
    displayName: "GitHub",
    icon: "github",
    iconColor: "dark",
    provider: "github",
    providerKey: "github",
  },
] as const;

/**
 * Status page URL
 */
export const STATUS_URL = "https://bondery.openstatus.dev/";

/**
 * Social media links
 */
export const SOCIAL_LINKS = {
  email: "team@usebondery.com",
  github: "https://github.com/usebondery/bondery",
  linkedin: "https://linkedin.com/company/bondery",
} as const;
