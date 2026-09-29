import type { ApiErrorResponse } from "@bondery/schemas/errors";
import { toApiErrorResponse } from "../../lib/platform/errors/to-api-error-response.js";

export function formatToolDomainError(error: unknown, requestId: string): ApiErrorResponse {
  return toApiErrorResponse(error, requestId);
}
