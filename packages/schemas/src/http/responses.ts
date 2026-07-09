import type { z } from "zod";
import type { ApiErrorResponse } from "#entities/api.js";
import { apiErrorResponseSchema } from "#entities/api.js";
import {
  EXAMPLE_ERROR_400,
  EXAMPLE_ERROR_401,
  EXAMPLE_ERROR_403,
  EXAMPLE_ERROR_404,
  EXAMPLE_ERROR_409,
  EXAMPLE_ERROR_429,
  EXAMPLE_ERROR_500,
  EXAMPLE_ERROR_503,
} from "#openapi/fixtures/errors.js";
import { getSchemaExample } from "#openapi/get-schema-example.js";
import { syncConflictErrorResponseSchema } from "#sync/conflict.js";

function jsonResponse<T extends z.ZodType>(
  schema: T,
  description: string,
  exampleOverride?: unknown,
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
  } as const;
}

/** Per-route error responses — schema uses component id (see apiErrorResponseSchema.meta). */
function errorResponse(description: string, example: ApiErrorResponse) {
  return jsonResponse(apiErrorResponseSchema, description, example);
}

/** Standard HTTP error responses for integration and session routes. */
export const standardErrorResponses = {
  400: errorResponse("Invalid request", EXAMPLE_ERROR_400),
  401: errorResponse("Authentication required", EXAMPLE_ERROR_401),
  403: errorResponse("Forbidden", EXAMPLE_ERROR_403),
  404: errorResponse("Resource not found", EXAMPLE_ERROR_404),
  429: errorResponse("Too many requests", EXAMPLE_ERROR_429),
  500: errorResponse("Internal server error", EXAMPLE_ERROR_500),
  503: errorResponse("Service unavailable", EXAMPLE_ERROR_503),
} as const;

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
    201: jsonResponse(schema, description, example),
  } as const;
}

/** Documented empty success response. */
export const noContentResponse = {
  204: {
    description: "No content",
  },
} as const;
