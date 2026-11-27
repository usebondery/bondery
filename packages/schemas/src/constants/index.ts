const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;
const AVATAR_MAX_MIB = 5;
export const CONTACT_FIELD_MAX_LENGTHS = {
  addressLabel: 64,
  dateName: 50,
  dateNote: 50,
  description: 500,
  firstName: 50,
  fullName: 150,
  headline: 100,
  lastName: 50,
  location: 100,
  middleName: 50,
  notesHtml: 20_000,
} as const;

export const CONTACT_LIMITS = {
  maxAddresses: 5,
  maxEmails: 5,
  maxImportantDates: 5,
  maxPhones: 5,
} as const;

/** Shared max length for group and tag labels. */
export const GROUP_LABEL_MAX_LENGTH = 100;

/** ISO date sentinel for year-less recurring dates (birthdays, namedays). */
export const YEARLESS_DATE_SENTINEL = 1904;

export const IMPORTANT_DATE_TYPES = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
] as const;

/** Reminder lead times, in days before an important date. */
export const NOTIFY_DAY_BEFORE = 1;
export const NOTIFY_FEW_DAYS_BEFORE = 3;
export const NOTIFY_WEEK_BEFORE = 7;

export const IMPORTANT_DATE_NOTIFY_DAYS = [
  NOTIFY_DAY_BEFORE,
  NOTIFY_FEW_DAYS_BEFORE,
  NOTIFY_WEEK_BEFORE,
] as const;

/** Maximum number of tag ids accepted by a contact filter and by `tag_ids` on the people list query. */
export const MAX_TAG_FILTER_IDS = 20;

/** Maximum number of tool activities stored on one chat message. */
export const CHAT_MESSAGE_MAX_ACTIVITIES = 20;

/** Shortest search text the geocoder accepts. */
export const GEOCODE_SEARCH_MIN_LENGTH = 3;

export const AVATAR_UPLOAD = {
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"] as const,
  maxFileSizeBytes: AVATAR_MAX_MIB * BYTES_PER_MIB,
  maxFileSizeMB: AVATAR_MAX_MIB,
} as const;

export const API_KEY_LIMITS = {
  labelMaxLength: 100,
  maxPerUser: 5,
} as const;

export const PASSKEY_LIMITS = {
  maxPerUser: 5,
  nameMaxLength: 100,
} as const;

export const API_KEY_PREFIX = "bondery_key_" as const;

/** Prefix of a CardDAV device password. REST rejects it and the DAV shell requires it. */
export const CARDDAV_KEY_PREFIX = "bondery_dav_" as const;

/** CardDAV sync limits. Each one bounds memory, request size, or per-user fan-out. */
export const CARDDAV_LIMITS = {
  /** Longest device name, also the Better Auth key name limit. */
  deviceNameMaxLength: 100,
  /** Connected devices per user. Each device owns one key. */
  maxDevicesPerUser: 5,
  /** Opaque (group) cards per address book. */
  maxOpaqueCards: 200,
  /** Hrefs one `addressbook-multiget` may name. */
  multigetMaxHrefs: 1000,
  /** Largest vCard the server stores for a card it does not map (group cards). */
  opaqueCardMaxBytes: 262_144,
  /** Persons the reconciler folds into the address book per transaction. */
  reconcileChunkSize: 500,
} as const;

/** Secret chars shown in list UI after the prefix (`bondery_key_abc…`). */
export const API_KEY_START_DISPLAY_SECRET_CHARS = 3;

/** Better Auth `start` field length: prefix + {@link API_KEY_START_DISPLAY_SECRET_CHARS}. */
export const API_KEY_START_DISPLAY_LENGTH =
  API_KEY_PREFIX.length + API_KEY_START_DISPLAY_SECRET_CHARS;

/** Better Auth api-key permission resource (see @better-auth/api-key permissions). */
export const API_KEY_BA_RESOURCE = "api" as const;

/** Allowed Better Auth permission actions for API keys (validation layer). */
export const API_KEY_BA_ACTIONS = ["read", "write", "delete", "full"] as const;

/** Product-facing API key scopes exposed in UI and /me/api-keys. */
export const API_KEY_PERMISSIONS = ["read", "full"] as const;

export * from "#constants/dev-ports.js";
export * from "#constants/import.js";
export * from "#constants/license.js";
