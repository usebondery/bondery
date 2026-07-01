import { EXAMPLE_CONTACT_ID } from "#contact-id.js";

export { EXAMPLE_CONTACT_ID };

/** Example auth user UUID for OpenAPI samples. */
export const EXAMPLE_USER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/** Second contact UUID for merge / relationship samples. */
export const EXAMPLE_CONTACT_ID_2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

/** ISO 8601 UTC timestamp for OpenAPI date-time fields. */
export const EXAMPLE_ISO_TIMESTAMP = "2026-01-15T12:00:00.000Z";

/** Calendar date (YYYY-MM-DD) for important dates and timelines. */
export const EXAMPLE_DATE = "2026-01-15";

/** Shared pagination metadata for list responses. */
export const EXAMPLE_PAGINATION = {
  limit: 50,
  offset: 0,
  totalCount: 1,
  hasMore: false,
  sort: null,
  search: null,
} as const;
