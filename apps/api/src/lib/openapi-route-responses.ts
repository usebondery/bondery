import type { z } from "zod";
import {
  createdResponse,
  okResponse,
  standardErrorResponses,
} from "@bondery/schemas/http/responses";

/** HTTP 200 success plus standard API error responses. */
export function withOkResponse<T extends z.ZodType>(schema: T, description: string) {
  return {
    ...okResponse(schema, description),
    ...standardErrorResponses,
  };
}

/** HTTP 201 success plus standard API error responses. */
export function withCreatedResponse<T extends z.ZodType>(
  schema: T,
  description: string,
) {
  return {
    ...createdResponse(schema, description),
    ...standardErrorResponses,
  };
}

/** Standard error responses only (e.g. webhooks with opaque bodies). */
export function withErrorResponses<
  T extends Record<number, z.ZodType | undefined>,
>(successResponses: T) {
  return {
    ...successResponses,
    ...standardErrorResponses,
  };
}
