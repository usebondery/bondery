import type { ApiErrorType } from "../api-error-types.js";

export interface ApiErrorBody {
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
