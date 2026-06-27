/**
 * Application configuration constants
 */

import type {
  ContactAddressType,
  ContactType,
  ImportantDateType,
  RelationshipType,
} from "@bondery/schemas";
import {
  AVATAR_UPLOAD as SCHEMA_AVATAR_UPLOAD,
  CONTACT_FIELD_MAX_LENGTHS,
  CONTACT_LIMITS,
} from "@bondery/schemas";
import { IMPORTANT_DATE_TYPE_META, CONTACT_ADDRESS_TYPE_OPTIONS, CONTACT_CHANNEL_TYPE_OPTIONS } from "@bondery/helpers";
import { GEOCODE_SUGGEST_DEBOUNCE_MS } from "@bondery/helpers/address";

export const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL!;
export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL!;

/**
 * Normalizes the API base URL to origin-only format.
 * This prevents accidental `/api/api/...` requests when `NEXT_PUBLIC_API_URL`
 * is configured with a trailing `/api` segment.
 */
function normalizeApiBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/+$/, "").replace(/\/api$/, "");
}

export const API_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL!);

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
  /** Toggle the navigation sidebar (Ctrl+B / ⌘+B) */
  SIDEBAR_TOGGLE: "mod+b",
  /** Open the command palette (Ctrl+K / ⌘+K) */
  COMMAND_PALETTE: "mod+k",
  /** Open the "Log interaction" modal */
  LOG_INTERACTION: "n",
  /** Open the "Add person" modal */
  ADD_PERSON: "c",
  /** Open the "Find person" spotlight */
  FIND_PERSON: "f",
} as const;

export const LIMITS = {
  maxImportantDates: CONTACT_LIMITS.maxImportantDates,
  maxAddresses: CONTACT_LIMITS.maxAddresses,
} as const;

/**
 * UI debounce delay constants (milliseconds).
 * Import these instead of hardcoding magic numbers.
 */
export const DEBOUNCE_MS = {
  /** Delay for text search inputs before triggering a server/router fetch. */
  search: 600,
  /** Delay after the user stops panning/zooming the map before fetching new pins. */
  mapViewport: 600,
  /** Debounce for the contact picker's server-side search (PeopleMultiPickerInput). */
  contactPicker: 600,
  /** Debounce for local client-side filtering (no server call, e.g. emojis, table search). */
  localFilter: 200,
  /** @deprecated Use localFilter for client-side filtering. */
  tableSearch: 200,
  /** Debounce inside LocationLookupInput before calling the map suggestion API. */
  locationSuggest: GEOCODE_SUGGEST_DEBOUNCE_MS,
} as const;

export const IMPORTANT_DATE_TYPE_OPTIONS: ReadonlyArray<{
  value: ImportantDateType;
  emoji: string;
}> = [
  { value: "birthday", emoji: IMPORTANT_DATE_TYPE_META.birthday.emoji },
  { value: "anniversary", emoji: IMPORTANT_DATE_TYPE_META.anniversary.emoji },
  { value: "nameday", emoji: IMPORTANT_DATE_TYPE_META.nameday.emoji },
  { value: "graduation", emoji: IMPORTANT_DATE_TYPE_META.graduation.emoji },
  { value: "other", emoji: IMPORTANT_DATE_TYPE_META.other.emoji },
] as const;

export const IMPORTANT_DATE_NOTIFY_OPTIONS: ReadonlyArray<{
  value: "none" | "1" | "3" | "7";
}> = [{ value: "none" }, { value: "1" }, { value: "3" }, { value: "7" }] as const;

export const RELATIONSHIP_TYPE_OPTIONS: ReadonlyArray<{
  value: RelationshipType;
  emoji: string;
}> = [
  { value: "parent", emoji: "👨‍👩‍👧" },
  { value: "child", emoji: "🧒" },
  { value: "spouse", emoji: "💍" },
  { value: "partner", emoji: "❤️" },
  { value: "sibling", emoji: "👫" },
  { value: "friend", emoji: "🤝" },
  { value: "colleague", emoji: "💼" },
  { value: "neighbor", emoji: "🏡" },
  { value: "guardian", emoji: "🛡️" },
  { value: "dependent", emoji: "🫶" },
  { value: "other", emoji: "🔗" },
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
    provider: "linkedin",
    providerKey: "linkedin_oidc",
    displayName: "LinkedIn",
    iconColor: "#0A66C2",
    backgroundColor: "#0A66C2",
    icon: "linkedin",
    active: true,
  },
  {
    provider: "github",
    providerKey: "github",
    displayName: "GitHub",
    iconColor: "dark",
    backgroundColor: "black",
    icon: "github",
    active: true,
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
  github: "https://github.com/usebondery/bondery",
  linkedin: "https://linkedin.com/company/bondery",
  email: "team@usebondery.com",
} as const;
