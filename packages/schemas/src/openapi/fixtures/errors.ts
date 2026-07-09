import { EXAMPLE_CONTACT } from "./entities.js";

const EXAMPLE_REQUEST_ID = "00000000-0000-0000-0000-000000000000";
const EXAMPLE_DOC_BASE = "https://usebondery.com";

function exampleError(params: {
  type:
    | "invalid_request_error"
    | "authentication_error"
    | "authorization_error"
    | "not_found_error"
    | "conflict_error"
    | "rate_limit_error"
    | "api_error"
    | "service_unavailable_error";
  code: string;
  message: string;
  param?: string;
  retry_after?: number;
  details?: Record<string, unknown>;
}) {
  return {
    error: {
      code: params.code,
      doc_url: `${EXAMPLE_DOC_BASE}/docs/api/errors/${params.code}`,
      message: params.message,
      request_id: EXAMPLE_REQUEST_ID,
      type: params.type,
      ...(params.param ? { param: params.param } : {}),
      ...(params.retry_after !== undefined ? { retry_after: params.retry_after } : {}),
      ...(params.details ? { details: params.details } : {}),
    },
  } as const;
}

/** Matches validation error formatter: `${field} ${message}`. */
export const EXAMPLE_ERROR_400 = exampleError({
  code: "validation_error",
  message: "body.email Invalid input",
  param: "body.email",
  type: "invalid_request_error",
});

/** Session auth failure from verifySession. */
export const EXAMPLE_ERROR_401 = exampleError({
  code: "auth_required",
  message: "Unauthorized - Please log in",
  type: "authentication_error",
});

/** Generic forbidden response (error handler wire format). */
export const EXAMPLE_ERROR_403 = exampleError({
  code: "admin_required",
  message: "Forbidden",
  type: "authorization_error",
});

/** Common DomainError not-found message. */
export const EXAMPLE_ERROR_404 = exampleError({
  code: "contact_not_found",
  message: "Contact not found",
  type: "not_found_error",
});

/** Relationship duplicate from POST /api/contacts/:id/relationships. */
export const EXAMPLE_ERROR_409 = exampleError({
  code: "relationship_already_exists",
  message: "Relationship already exists",
  type: "conflict_error",
});

/** Global rate limit from @fastify/rate-limit errorResponse builder. */
export const EXAMPLE_ERROR_429 = exampleError({
  code: "rate_limit_exceeded",
  message: "Rate limit exceeded. Retry in 42 seconds.",
  retry_after: 42,
  type: "rate_limit_error",
});

export const EXAMPLE_ERROR_500 = exampleError({
  code: "internal_server_error",
  message: "Internal Server Error",
  type: "api_error",
});

export const EXAMPLE_ERROR_503 = exampleError({
  code: "service_unavailable",
  message: "Service unavailable",
  type: "service_unavailable_error",
});

/** Sync conflict from PATCH /api/contacts/:id when server contact is newer. */
export const EXAMPLE_SYNC_CONFLICT_ERROR = exampleError({
  code: "sync_conflict",
  details: { contact: EXAMPLE_CONTACT },
  message: "Contact was modified on another device",
  type: "conflict_error",
});
