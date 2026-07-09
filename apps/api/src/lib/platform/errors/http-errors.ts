import type { ApiErrorCode } from "@bondery/schemas/errors";
import { DomainError } from "../../../domains/_shared/context.js";
import { GENERIC_500_MESSAGE, SERVICE_UNAVAILABLE_MESSAGE } from "./codes.js";

export function unauthorized(message: string, code: ApiErrorCode): DomainError {
  return new DomainError(message, 401, code);
}

export function forbidden(
  message: string,
  code: ApiErrorCode,
  details?: Record<string, unknown>,
): DomainError {
  return new DomainError(message, 403, code, undefined, details);
}

export function badRequest(message: string, code: ApiErrorCode): DomainError {
  return new DomainError(message, 400, code);
}

export function notFound(message: string, code: ApiErrorCode): DomainError {
  return new DomainError(message, 404, code);
}

export function conflict(message: string, code: ApiErrorCode): DomainError {
  return new DomainError(message, 409, code);
}

export function internal(code: ApiErrorCode, cause?: unknown): DomainError {
  return new DomainError(GENERIC_500_MESSAGE, 500, code, cause);
}

export function serviceUnavailable(cause?: unknown): DomainError {
  return new DomainError(SERVICE_UNAVAILABLE_MESSAGE, 503, "service_unavailable", cause);
}
