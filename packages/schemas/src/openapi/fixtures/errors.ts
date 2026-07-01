import { EXAMPLE_CONTACT } from "./entities.js";

/** Matches validation error formatter: `${field} ${message}`. */
export const EXAMPLE_ERROR_400 = {
  error: "body.email Invalid input",
} as const;

/** Session auth failure from verifySession. */
export const EXAMPLE_ERROR_401 = {
  error: "Unauthorized - Please log in",
} as const;

/** Generic forbidden response (error handler wire format). */
export const EXAMPLE_ERROR_403 = {
  error: "Forbidden",
} as const;

/** Common DomainError not-found message. */
export const EXAMPLE_ERROR_404 = {
  error: "Contact not found",
} as const;

/** Relationship duplicate from POST /api/contacts/:id/relationships. */
export const EXAMPLE_ERROR_409 = {
  error: "Relationship already exists",
} as const;

/** Global rate limit from @fastify/rate-limit errorResponse builder. */
export const EXAMPLE_ERROR_429 = {
  error: "Rate limit exceeded. Retry in 42 seconds.",
  retryAfter: 42,
} as const;

export const EXAMPLE_ERROR_500 = {
  error: "Internal Server Error",
} as const;

export const EXAMPLE_ERROR_503 = {
  error: "Service unavailable",
} as const;

/** Sync conflict from PATCH /api/contacts/:id when server contact is newer. */
export const EXAMPLE_SYNC_CONFLICT_ERROR = {
  error: "Contact was modified on another device",
  contact: EXAMPLE_CONTACT,
} as const;
