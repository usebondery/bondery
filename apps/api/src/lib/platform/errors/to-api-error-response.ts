import {
  type ApiErrorBody,
  type ApiErrorResponse,
  type ApiErrorType,
  getErrorDefinition,
  getErrorDocUrl,
  isApiErrorCode,
} from "@bondery/schemas/errors";
import { DomainError } from "../../../domains/_shared/context.js";
import { URLS } from "../config.js";
import { type ErrorCode, GENERIC_500_MESSAGE } from "./codes.js";

function isServerError(statusCode: number): boolean {
  return statusCode >= 500;
}

function websiteBaseUrl(): string {
  return (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
}

function catalogType(code: ErrorCode): ApiErrorType {
  return getErrorDefinition(code).type;
}

export function buildApiErrorBody(params: {
  code: string;
  details?: Record<string, unknown>;
  message: string;
  param?: string;
  requestId: string;
  retry_after?: number;
  type: ApiErrorType;
}): ApiErrorBody {
  const code = isApiErrorCode(params.code) ? params.code : "internal_server_error";
  const definition = isApiErrorCode(code) ? getErrorDefinition(code) : null;
  const type = definition?.type ?? params.type;

  const body: ApiErrorBody = {
    code,
    doc_url: getErrorDocUrl(code, websiteBaseUrl()),
    message: params.message,
    request_id: params.requestId,
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

function wrap(body: ApiErrorBody): ApiErrorResponse {
  return { error: body };
}

/** Nested Stripe-style error body shared by REST, MCP tools, and in-app chat tools. */
export function toApiErrorResponse(error: unknown, requestId: string): ApiErrorResponse {
  if (error instanceof DomainError) {
    if (isServerError(error.statusCode)) {
      return wrap(
        buildApiErrorBody({
          code: error.code,
          message: GENERIC_500_MESSAGE,
          requestId,
          type: catalogType(error.code),
        }),
      );
    }

    const details = error.details ? { ...error.details } : undefined;
    return wrap(
      buildApiErrorBody({
        code: error.code,
        details,
        message: error.message,
        param: error.param,
        requestId,
        type: error.type ?? catalogType(error.code),
      }),
    );
  }

  return wrap(
    buildApiErrorBody({
      code: "internal_server_error",
      message: GENERIC_500_MESSAGE,
      requestId,
      type: "api_error",
    }),
  );
}
