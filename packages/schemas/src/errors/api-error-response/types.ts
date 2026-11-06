import type { ApiErrorType } from "../api-error-types.js";

export interface ApiErrorBody {
  /** Recovery instruction for an AI agent. WHAT failed, WHY, and HOW to fix the call. */
  agent_message: string;
  code: string;
  details?: Record<string, unknown>;
  doc_url: string;
  message: string;
  param?: string;
  request_id: string;
  retry_after?: number;
  type: ApiErrorType;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}
