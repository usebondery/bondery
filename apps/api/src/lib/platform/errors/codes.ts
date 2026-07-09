/** Re-export canonical error codes from @bondery/schemas. */
export {
  API_ERROR_CODE_ENTRIES,
  API_ERROR_CODES,
  type ApiErrorCode,
  type ApiErrorType,
  getErrorDefinition,
  getErrorDocUrl,
  isApiErrorCode,
} from "@bondery/schemas/errors";

export type ErrorCode = ApiErrorCode;

export const GENERIC_500_MESSAGE = "Internal Server Error";
export const SERVICE_UNAVAILABLE_MESSAGE = "Service unavailable";
