export const API_ERROR_TYPES = [
  "invalid_request_error",
  "authentication_error",
  "authorization_error",
  "not_found_error",
  "conflict_error",
  "rate_limit_error",
  "api_error",
  "service_unavailable_error",
] as const;

export type ApiErrorType = (typeof API_ERROR_TYPES)[number];
