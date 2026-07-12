import { z } from "zod";
import { API_ERROR_TYPES } from "../api-error-types.js";
import type { ApiErrorBody, ApiErrorResponse } from "./types.js";

export const apiErrorBodySchema = z
  .object({
    code: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    doc_url: z.string().url(),
    message: z.string(),
    param: z.string().optional(),
    request_id: z.string(),
    retry_after: z.number().int().positive().optional(),
    type: z.enum(API_ERROR_TYPES),
  })
  .meta({ id: "ApiErrorBody" }) satisfies z.ZodType<ApiErrorBody>;

export const apiErrorResponseSchema = z
  .object({
    error: apiErrorBodySchema,
  })
  .meta({ id: "ApiErrorResponse" }) satisfies z.ZodType<ApiErrorResponse>;
