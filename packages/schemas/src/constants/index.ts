export const CONTACT_FIELD_MAX_LENGTHS = {
  firstName: 50,
  middleName: 50,
  lastName: 50,
  fullName: 150,
  headline: 100,
  location: 100,
  description: 500,
  addressLabel: 64,
  dateNote: 50,
  dateName: 50,
  notesHtml: 20000,
} as const;

export const CONTACT_LIMITS = {
  maxImportantDates: 5,
  maxPhones: 5,
  maxEmails: 5,
  maxAddresses: 5,
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

export const IMPORTANT_DATE_NOTIFY_DAYS = [1, 3, 7] as const;

export const AVATAR_UPLOAD = {
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"] as const,
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxFileSizeMB: 5,
} as const;
