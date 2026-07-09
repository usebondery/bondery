import type { ApiErrorType } from "@bondery/schemas/errors";
import { ApiError } from "./ApiError.js";

type NestedApiErrorJson = {
  error?: {
    type?: unknown;
    code?: unknown;
    message?: unknown;
    param?: unknown;
    doc_url?: unknown;
    request_id?: unknown;
  };
};

export type ParsedApiErrorFields = {
  code: string | null;
  type: ApiErrorType | null;
  developerMessage: string | null;
  param: string | null;
  docUrl: string | null;
  requestId: string | null;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseNested(parsed: NestedApiErrorJson): ParsedApiErrorFields | null {
  const nested = parsed.error;
  if (!nested || typeof nested !== "object") {
    return null;
  }

  const developerMessage = readString(nested.message);
  const code = readString(nested.code);
  if (!developerMessage && !code) {
    return null;
  }

  const type = readString(nested.type);
  return {
    code,
    developerMessage,
    docUrl: readString(nested.doc_url),
    param: readString(nested.param),
    requestId: readString(nested.request_id),
    type: type as ApiErrorType | null,
  };
}

const EMPTY_FIELDS: ParsedApiErrorFields = {
  code: null,
  developerMessage: null,
  docUrl: null,
  param: null,
  requestId: null,
  type: null,
};

export function extractApiErrorFields(text: string): ParsedApiErrorFields {
  try {
    const parsed = JSON.parse(text) as NestedApiErrorJson;
    return parseNested(parsed) ?? EMPTY_FIELDS;
  } catch {
    return EMPTY_FIELDS;
  }
}

export function buildApiErrorFromResponse(params: { status: number; bodyText: string }): ApiError {
  const fields = extractApiErrorFields(params.bodyText);
  return new ApiError({
    code: fields.code ?? "internal_server_error",
    developerMessage: fields.developerMessage ?? `HTTP ${params.status}`,
    docUrl: fields.docUrl,
    param: fields.param,
    requestId: fields.requestId,
    status: params.status,
    type: fields.type,
  });
}
