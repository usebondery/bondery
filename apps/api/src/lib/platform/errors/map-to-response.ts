import {
  type ApiErrorType,
  getErrorDefinition,
  getErrorDocUrl,
  isApiErrorCode,
} from "@bondery/schemas/errors";
import type { FastifyError, FastifyRequest } from "fastify";
import { RequestValidationError } from "fastify-zod-openapi";
import { DomainError } from "../../../domains/_shared/context.js";
import { SyncConflictError } from "../../sync/conflict.js";
import { URLS } from "../config.js";
import { type ErrorCode, GENERIC_500_MESSAGE } from "./codes.js";

export interface MappedErrorResponse {
  body: { error: Record<string, unknown> };
  statusCode: number;
}

function isServerError(statusCode: number): boolean {
  return statusCode >= 500;
}

function websiteBaseUrl(): string {
  return (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
}

function buildErrorBody(params: {
  type: ApiErrorType;
  code: string;
  message: string;
  request: FastifyRequest;
  param?: string;
  retry_after?: number;
  details?: Record<string, unknown>;
}): Record<string, unknown> {
  const code = isApiErrorCode(params.code) ? params.code : "internal_server_error";
  const definition = isApiErrorCode(code) ? getErrorDefinition(code) : null;
  const type = definition?.type ?? params.type;

  const body: Record<string, unknown> = {
    code,
    doc_url: getErrorDocUrl(code, websiteBaseUrl()),
    message: params.message,
    request_id: params.request.id,
    type,
  };

  if (params.param) {
    body.param = params.param;
  }
  if (params.retry_after !== undefined) {
    body.retry_after = params.retry_after;
  }
  if (params.details) {
    body.details = params.details;
  }

  return body;
}

function wrap(body: Record<string, unknown>): { error: Record<string, unknown> } {
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
        buildErrorBody({
          code: "validation_error",
          message: error.message,
          param,
          request,
          type: "invalid_request_error",
        }),
      ),
      statusCode: 400,
    };
  }

  if (error instanceof SyncConflictError) {
    return {
      body: wrap(
        buildErrorBody({
          code: "sync_conflict",
          details: { contact: error.serverContact },
          message: error.message,
          request,
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
      const { type } = codeTypeAndStatus(error.code);
      return {
        body: wrap(
          buildErrorBody({
            code: error.code,
            message: GENERIC_500_MESSAGE,
            request,
            type,
          }),
        ),
        statusCode: error.statusCode,
      };
    }

    const { type } = codeTypeAndStatus(error.code);
    const details = error.details ? { ...error.details } : undefined;
    return {
      body: wrap(
        buildErrorBody({
          code: error.code,
          details,
          message: error.message,
          param: error.param,
          request,
          type: error.type ?? type,
        }),
      ),
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
        buildErrorBody({
          code,
          message: error.message,
          request,
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
      body: wrap(
        buildErrorBody({
          code: "internal_server_error",
          message: GENERIC_500_MESSAGE,
          request,
          type: "api_error",
        }),
      ),
      statusCode,
    };
  }

  const rawCode = error.code ?? "";
  const code = isApiErrorCode(rawCode) ? rawCode : "internal_server_error";
  const { type } = isApiErrorCode(code)
    ? codeTypeAndStatus(code)
    : { status: statusCode, type: "api_error" as ApiErrorType };

  return {
    body: wrap(
      buildErrorBody({
        code,
        message: error.message,
        request,
        type,
      }),
    ),
    statusCode,
  };
}
