import type { ApiErrorType } from "@bondery/schemas/errors";
import { isApiErrorCode } from "@bondery/schemas/errors";
import type { ApiErrorTranslateFn } from "./types.js";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly type: ApiErrorType | null;
  readonly param: string | null;
  readonly docUrl: string | null;
  readonly requestId: string | null;
  readonly developerMessage: string;

  constructor(params: {
    developerMessage: string;
    status: number;
    code: string;
    type?: ApiErrorType | null;
    param?: string | null;
    docUrl?: string | null;
    requestId?: string | null;
  }) {
    super(params.developerMessage);
    this.name = "ApiError";
    this.developerMessage = params.developerMessage;
    this.status = params.status;
    this.code = params.code;
    this.type = params.type ?? null;
    this.param = params.param ?? null;
    this.docUrl = params.docUrl ?? null;
    this.requestId = params.requestId ?? null;
  }

  getUserMessage(t: ApiErrorTranslateFn): string {
    if (this.param) {
      const fieldMessage = t(`errors.validation.${this.param}`, {
        defaultValue: "",
      });
      if (fieldMessage) {
        return fieldMessage;
      }
    }

    if (isApiErrorCode(this.code)) {
      return t(`errors.api.${this.code}`, {
        defaultValue: t("errors.unknown"),
      });
    }

    return t("errors.unknown");
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isUnauthorizedApiError(error: unknown): boolean {
  return isApiError(error) && error.status === 401;
}
