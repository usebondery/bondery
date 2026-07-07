export const IMPORT_MAX_CONTACTS_PER_SESSION = 2000;

export const SOCIAL_IMPORT_COMMIT_BATCH_SIZE = 100;
export const VCARD_IMPORT_COMMIT_BATCH_SIZE = 25;

/** Postgres IN-list chunk size for handle lookups during import parse/commit. */
export const IMPORT_HANDLE_LOOKUP_CHUNK_SIZE = 150;

/** Commit rate limit sized for worst-case batching (vCard). */
export const IMPORT_COMMIT_RATE_LIMIT = {
  max: Math.max(
    Math.ceil(IMPORT_MAX_CONTACTS_PER_SESSION / SOCIAL_IMPORT_COMMIT_BATCH_SIZE),
    Math.ceil(IMPORT_MAX_CONTACTS_PER_SESSION / VCARD_IMPORT_COMMIT_BATCH_SIZE),
  ),
  timeWindow: "10 minutes",
} as const;
