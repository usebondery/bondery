import type { z } from "zod";
import { apiErrorResponseSchema } from "#errors/api-error-response/index.js";
import type { ApiErrorResponse } from "#errors/api-error-response/types.js";
import {
  EXAMPLE_ERROR_400,
  EXAMPLE_ERROR_401,
  EXAMPLE_ERROR_403,
  EXAMPLE_ERROR_404,
  EXAMPLE_ERROR_409,
  EXAMPLE_ERROR_426,
  EXAMPLE_ERROR_429,
  EXAMPLE_ERROR_500,
  EXAMPLE_ERROR_503,
} from "#openapi/fixtures/errors.js";
import { getSchemaExample } from "#openapi/get-schema-example.js";
import { syncConflictErrorResponseSchema } from "#sync/conflict/index.js";

/**
 * Policy names match the tier object in the API rate-limit plugin.
 * `csp_report` and `not_found` share quota 60 and window 60.
 */
const RATE_LIMIT_POLICY_NAMES =
  "default|ai|enrich|geocode|export|import|health|mcp|csp_report|not_found";

const RATE_LIMIT_POLICY_DESCRIPTION = [
  "Quota policy for this response.",
  "The value follows draft-ietf-httpapi-ratelimit-headers-11.",
  "This draft is not RFC 9237.",
  "The policy name is one of default, ai, enrich, geocode, export, " +
    "import, health, mcp, csp_report, or not_found.",
  "q is the quota.",
  "w is the window in seconds.",
].join(" ");

const RATE_LIMIT_DESCRIPTION = [
  "Remaining quota for this response.",
  "The value follows draft-ietf-httpapi-ratelimit-headers-11.",
  "This draft is not RFC 9237.",
  "The policy name matches the RateLimit-Policy header.",
  "r is the remaining requests.",
  "t is the seconds until reset.",
  "On HTTP 429, r is 0.",
].join(" ");

const RETRY_AFTER_DESCRIPTION = [
  "Delay in whole seconds.",
  "The API includes this header on HTTP 429 only.",
  "The value is an integer delay-seconds count.",
  "The value equals t in the RateLimit header.",
  "The value equals error.retry_after.",
].join(" ");

type RateLimitHeaderObject = {
  description: string;
  example: number | string;
  required: boolean;
  schema: {
    minimum?: number;
    pattern?: string;
    type: "integer" | "string";
  };
};

type RateLimitHeaderMap = Record<string, RateLimitHeaderObject>;

/** Structured-field quota policy. Not a JSON object. */
export const rateLimitPolicyHeader: RateLimitHeaderObject = {
  description: RATE_LIMIT_POLICY_DESCRIPTION,
  example: '"default";q=300;w=60',
  required: true,
  schema: {
    pattern: `^"(${RATE_LIMIT_POLICY_NAMES})";q=\\d+;w=\\d+$`,
    type: "string",
  },
};

/** Structured-field remaining quota. Not a JSON object. */
export const rateLimitHeader: RateLimitHeaderObject = {
  description: RATE_LIMIT_DESCRIPTION,
  example: '"default";r=12;t=47',
  required: true,
  schema: {
    pattern: `^"(${RATE_LIMIT_POLICY_NAMES})";r=\\d+;t=\\d+$`,
    type: "string",
  },
};

/** Delay-seconds count. Required on HTTP 429 only. */
export const retryAfterHeader: RateLimitHeaderObject = {
  description: RETRY_AFTER_DESCRIPTION,
  example: 47,
  required: true,
  schema: {
    minimum: 0,
    type: "integer",
  },
};

/** Headers on each limited success response. */
export const limitedRateLimitHeaders: RateLimitHeaderMap = {
  RateLimit: rateLimitHeader,
  "RateLimit-Policy": rateLimitPolicyHeader,
};

/** Headers on HTTP 429. `r` is 0 and Retry-After equals `t`. */
export const tooManyRequestsHeaders: RateLimitHeaderMap = {
  ...limitedRateLimitHeaders,
  "Retry-After": retryAfterHeader,
};

function jsonResponse<T extends z.ZodType>(
  schema: T,
  description: string,
  exampleOverride?: unknown,
  headers?: RateLimitHeaderMap,
) {
  const example = exampleOverride ?? getSchemaExample(schema);
  return {
    content: {
      "application/json": {
        schema,
        ...(example !== undefined && { example }),
      },
    },
    description,
    ...(headers ? { headers } : {}),
  } as const;
}

/** Per-route error responses — schema uses component id (see apiErrorResponseSchema.meta). */
function errorResponse(
  description: string,
  example: ApiErrorResponse,
  headers?: RateLimitHeaderMap,
) {
  return jsonResponse(apiErrorResponseSchema, description, example, headers);
}

function standardErrorResponsesFor(tooManyRequests?: RateLimitHeaderMap) {
  return {
    400: errorResponse("Invalid request", EXAMPLE_ERROR_400),
    401: errorResponse("Authentication required", EXAMPLE_ERROR_401),
    403: errorResponse("Forbidden", EXAMPLE_ERROR_403),
    404: errorResponse("Resource not found", EXAMPLE_ERROR_404),
    426: errorResponse("Upgrade required", EXAMPLE_ERROR_426),
    429: errorResponse("Too many requests", EXAMPLE_ERROR_429, tooManyRequests),
    500: errorResponse("Internal server error", EXAMPLE_ERROR_500),
    503: errorResponse("Service unavailable", EXAMPLE_ERROR_503),
  } as const;
}

/** Standard HTTP error responses for integration and session routes. */
export const standardErrorResponses = standardErrorResponsesFor(tooManyRequestsHeaders);

/**
 * Same statuses as `standardErrorResponses`.
 * Use this on a route with `rateLimit: false`.
 * Those routes never send draft rate-limit headers.
 */
export const standardErrorResponsesWithoutRateLimit = standardErrorResponsesFor();

/** HTTP 409 conflict with standard ApiError body. */
export const conflictResponse = {
  409: errorResponse("Conflict", EXAMPLE_ERROR_409),
} as const;

/** HTTP 409 sync conflict including the current server contact. */
export const syncConflictResponse = {
  409: jsonResponse(syncConflictErrorResponseSchema, "Contact was modified on another device"),
} as const;

/** Wrap a success schema as HTTP 200 with a documented description. */
export function okResponse<T extends z.ZodType>(schema: T, description: string, example?: unknown) {
  return {
    200: jsonResponse(schema, description, example, limitedRateLimitHeaders),
  } as const;
}

/** HTTP 200 for a route that does not send draft rate-limit headers. */
export function okResponseWithoutRateLimit<T extends z.ZodType>(
  schema: T,
  description: string,
  example?: unknown,
) {
  return {
    200: jsonResponse(schema, description, example),
  } as const;
}

/** Wrap a success schema as HTTP 201 with a documented description. */
export function createdResponse<T extends z.ZodType>(
  schema: T,
  description: string,
  example?: unknown,
) {
  return {
    201: jsonResponse(schema, description, example, limitedRateLimitHeaders),
  } as const;
}

/**
 * Documented empty success response.
 * Limited routes send the draft rate-limit headers.
 * fastify-zod-openapi drops headers when `content` is absent.
 * The OpenAPI generator patch restores those headers.
 */
export const noContentResponse = {
  204: {
    description: "No content",
    headers: limitedRateLimitHeaders,
  },
} as const;
