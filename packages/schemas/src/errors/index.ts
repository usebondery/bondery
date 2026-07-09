export {
  API_ERROR_CODE_ENTRIES,
  API_ERROR_CODES,
  type ApiErrorCode,
  type ApiErrorDefinition,
  getErrorDefinition,
  getErrorDocPath,
  isApiErrorCode,
} from "./api-error-codes.generated.js";
export {
  type ApiErrorBody,
  type ApiErrorResponse,
  apiErrorBodySchema,
  apiErrorResponseSchema,
} from "./api-error-response.js";
export { API_ERROR_TYPES, type ApiErrorType } from "./api-error-types.js";

export function getErrorDocUrl(code: string, websiteBaseUrl: string): string {
  const base = websiteBaseUrl.replace(/\/$/, "");
  return `${base}/docs/api/errors/${code}`;
}
