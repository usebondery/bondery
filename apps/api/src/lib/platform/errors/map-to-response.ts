import { type ApiErrorResponse, type ApiErrorType, isApiErrorCode } from "@bondery/schemas/errors";
import type { FastifyError, FastifyRequest } from "fastify";
import { RequestValidationError } from "fastify-zod-openapi";
import { DomainError } from "../../../domains/_shared/context.js";
import { SyncConflictError } from "../../sync/conflict.js";
import { type ErrorCode, getErrorDefinition } from "./codes.js";
import { buildApiErrorBody, toApiErrorResponse } from "./to-api-error-response.js";

export interface MappedErrorResponse {
  body: ApiErrorResponse;
  statusCode: number;
}

function isServerError(statusCode: number): boolean {
  return statusCode >= 500;
}

function wrap(body: ReturnType<typeof buildApiErrorBody>): ApiErrorResponse {
  return { error: body };
}

function validationParam(message: string): string | undefined {
  const match = message.match(/^([^\s]+)\s+/);
  return match?.[1];
}

function codeTypeAndStatus(code: ErrorCode): { type: ApiErrorType; status: number } {
  const definition = getErrorDefinition(code);
  return { status: definition.httpStatus, type: definition.type };
}

export function mapErrorToResponse(
  error: FastifyError & { retryAfter?: number; code?: string },
  request: FastifyRequest,
): MappedErrorResponse {
  if (error instanceof RequestValidationError || error.validation) {
    const param = validationParam(error.message);
    return {
      body: wrap(
        buildApiErrorBody({
          code: "validation_error",
          message: error.message,
          param,
          requestId: request.id,
          type: "invalid_request_error",
        }),
      ),
      statusCode: 400,
    };
  }

  if (error instanceof SyncConflictError) {
    return {
      body: wrap(
        buildApiErrorBody({
          code: "sync_conflict",
          details: { contact: error.serverContact },
          message: error.message,
          requestId: request.id,
          type: "conflict_error",
        }),
      ),
      statusCode: 409,
    };
  }

  if (error instanceof DomainError) {
    if (isServerError(error.statusCode)) {
      request.log.error(
        {
          code: error.code,
          err: error.cause ?? error,
          reqId: request.id,
          userId: request.authUser?.id,
        },
        "server error",
      );
    }
    return {
      body: toApiErrorResponse(error, request.id),
      statusCode: error.statusCode,
    };
  }

  const statusCode = error.statusCode ?? 500;

  if (statusCode === 429) {
    const rawCode = error.code ?? "";
    const code = isApiErrorCode(rawCode) ? rawCode : "rate_limit_exceeded";
    const { type } = codeTypeAndStatus(code as ErrorCode);
    return {
      body: wrap(
        buildApiErrorBody({
          code,
          message: error.message,
          requestId: request.id,
          retry_after: error.retryAfter,
          type,
        }),
      ),
      statusCode: 429,
    };
  }

  if (isServerError(statusCode)) {
    request.log.error(
      {
        code: "internal_server_error",
        err: error,
        reqId: request.id,
        userId: request.authUser?.id,
      },
      "server error",
    );
    return {
      body: toApiErrorResponse(error, request.id),
      statusCode,
    };
  }

  const rawCode = error.code ?? "";
  const code = isApiErrorCode(rawCode) ? rawCode : "internal_server_error";
  const type = isApiErrorCode(code) ? codeTypeAndStatus(code).type : "api_error";

  return {
    body: wrap(
      buildApiErrorBody({
        code,
        message: error.message,
        requestId: request.id,
        type,
      }),
    ),
    statusCode,
  };
}
