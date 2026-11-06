import type { ApiErrorResponse } from "@bondery/schemas/errors";
import { toAgentToolErrorResponse } from "../../lib/platform/errors/to-api-error-response.js";

/**
 * In-app chat tool failure. The reader is a model, so it gets the same
 * recovery step as an MCP tool.
 */
export function formatToolDomainError(error: unknown, requestId: string): ApiErrorResponse {
  return toAgentToolErrorResponse(error, requestId);
}
