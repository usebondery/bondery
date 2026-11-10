import { z } from "zod";
import { API_ERROR_TYPES } from "../api-error-types.js";
import type { ApiErrorBody, ApiErrorResponse } from "./types.js";

export const apiErrorBodySchema = z
  .object({
    agent_message: z
      .string()
      .min(1)
      .describe(
        "Recovery instruction for an AI agent: what failed, why, and how to fix the call. Always present.",
      ),
    code: z.string().describe("Machine-readable error code"),
    details: z.record(z.string(), z.unknown()).optional().describe("Extra fields for this error"),
    doc_url: z.string().url().describe("Documentation URL for this error code"),
    message: z.string().describe("Human-readable error message"),
    param: z.string().optional().describe("Request field that caused the error"),
    request_id: z.string().describe("Identifier of this request"),
    retry_after: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Seconds to wait before the next request"),
    type: z.enum(API_ERROR_TYPES).describe("Error class"),
  })
  .meta({ id: "ApiErrorBody" }) satisfies z.ZodType<ApiErrorBody>;

export const apiErrorResponseSchema = z
  .object({
    error: apiErrorBodySchema.describe("Error payload"),
  })
  .meta({ id: "ApiErrorResponse" }) satisfies z.ZodType<ApiErrorResponse>;
