import {
  createdResponse,
  okResponse,
  okResponseWithoutRateLimit,
  standardErrorResponses,
  standardErrorResponsesWithoutRateLimit,
} from "@bondery/schemas/http/responses";
import type { z } from "zod";

/** HTTP 200 success plus standard API error responses. */
export function withOkResponse<T extends z.ZodType>(schema: T, description: string) {
  return {
    ...okResponse(schema, description),
    ...standardErrorResponses,
  };
}

/**
 * HTTP 200 and standard errors for a route with `rateLimit: false`.
 * These responses omit draft rate-limit headers.
 */
export function withUnmeteredOkResponse<T extends z.ZodType>(schema: T, description: string) {
  return {
    ...okResponseWithoutRateLimit(schema, description),
    ...standardErrorResponsesWithoutRateLimit,
  };
}

/** HTTP 201 success plus standard API error responses. */
export function withCreatedResponse<T extends z.ZodType>(schema: T, description: string) {
  return {
    ...createdResponse(schema, description),
    ...standardErrorResponses,
  };
}

/** Standard error responses only (e.g. webhooks with opaque bodies). */
export function withErrorResponses<T extends Record<number, z.ZodType | undefined>>(
  successResponses: T,
) {
  return {
    ...successResponses,
    ...standardErrorResponses,
  };
}
