import type { z } from "zod";
import { apiErrorResponseSchema as baseApiErrorResponseSchema } from "#entities/api.js";
import { getSchemaExample } from "#openapi/get-schema-example.js";

function jsonResponse<T extends z.ZodType>(
  schema: T,
  description: string,
  exampleOverride?: unknown,
) {
  const example = exampleOverride ?? getSchemaExample(schema);
  return {
    description,
    content: {
      "application/json": {
        schema,
        ...(example !== undefined && { example }),
      },
    },
  } as const;
}

/** Per-route error responses — no component id (registered once in openapi/registry.ts). */
function errorResponse(description: string) {
  return jsonResponse(baseApiErrorResponseSchema, description);
}

/** Standard HTTP error responses for integration and session routes. */
export const standardErrorResponses = {
  400: errorResponse("Invalid request"),
  401: errorResponse("Authentication required"),
  403: errorResponse("Forbidden"),
  404: errorResponse("Resource not found"),
  500: errorResponse("Internal server error"),
  503: errorResponse("Service unavailable"),
} as const;

/** Wrap a success schema as HTTP 200 with a documented description. */
export function okResponse<T extends z.ZodType>(
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
    201: jsonResponse(schema, description, example),
  } as const;
}

/** Documented empty success response. */
export const noContentResponse = {
  204: {
    description: "No content",
  },
} as const;
